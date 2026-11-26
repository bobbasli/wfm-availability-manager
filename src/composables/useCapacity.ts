import { isRecord as object } from '../helpers/response';
import type { CapacityRow } from '../types/capacity';
export type { CapacityRow } from '../types/capacity';
import { ref, watch, type Ref } from 'vue';
import type { RequestFunction } from '../services/genesysApi';
import { createWorkPlanDetailsLoader, queryAgentWorkPlans } from '../services/workforceManagement';
import { calculatePlanningSpace, unknownSpace, validMargin } from '../domain/planningSpace';
import { workPlanHours, type Interval } from '../domain/capacity';
import { localParts } from '../domain/time';
import { mondayOfWeek as monday } from '../helpers/week';

interface CapacityConfig {
  businessUnit: Ref<string>;
  managementUnit: Ref<string>;
  token: Ref<string>;
  agents: Ref<unknown>;
  request: RequestFunction;
  week?: Ref<string>;
}

export function unavailablePeriods(response: unknown): Interval[] {
  const list = Array.isArray(response)
    ? response
    : object(response)
      ? (response.entities ?? response.unavailableTimes ?? response.results ?? response.items)
      : null;
  if (!Array.isArray(list))
    throw Error('Unavailable Times-response heeft een onbekende structuur.');
  return list.map((item) => {
    if (!object(item)) throw Error('Ongeldig onbeschikbaar tijdvak.');
    const span = object(item.timeSpan) ? item.timeSpan : item;
    const start = typeof span.startDate === 'string' ? Date.parse(span.startDate) : NaN;
    const duration =
      typeof span.lengthMinutes === 'number' &&
      Number.isFinite(span.lengthMinutes) &&
      span.lengthMinutes > 0
        ? span.lengthMinutes
        : NaN;
    const end =
      typeof span.endDate === 'string' ? Date.parse(span.endDate) : start + duration * 60000;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      throw Error('Ongeldige begin-/eindtijd in Unavailable Times.');
    return [start, end] as Interval;
  });
}
export function useCapacity(config: CapacityConfig) {
  const stored = localStorage.getItem('wfm_capacity_margin');
  const parsed = stored === null ? 25 : Number(stored);
  const capacityMargin = ref<number | string>(stored !== '' && validMargin(parsed) ? parsed : 25);
  watch(
    capacityMargin,
    (value) => {
      if (validMargin(value)) localStorage.setItem('wfm_capacity_margin', String(value));
    },
    { flush: 'sync' },
  );
  const capacityWeek = config.week ?? ref(monday(localParts(Date.now()).date));
  const capacityBusy = ref(false),
    capacityProgress = ref(''),
    capacityError = ref('');
  const capacityRows = ref<CapacityRow[]>([]),
    capacityDiagnostics = ref<string[]>([]);
  let version = 0;
  watch(
    [config.businessUnit, config.managementUnit, config.token, capacityWeek, config.agents],
    () => {
      version++;
      capacityRows.value = [];
      capacityDiagnostics.value = [];
      capacityError.value = '';
      capacityProgress.value = 'Selectie gewijzigd; haal het overzicht opnieuw op.';
    },
    { flush: 'sync' },
  );
  function invalidateCapacity() {
    version++;
    capacityRows.value = [];
    capacityProgress.value = 'Beschikbaarheid gewijzigd; capaciteit moet opnieuw worden opgehaald.';
  }
  async function loadCapacity() {
    if (
      capacityBusy.value ||
      !config.token.value ||
      !config.managementUnit.value ||
      !config.businessUnit.value
    )
      return;
    capacityBusy.value = true;
    capacityRows.value = [];
    capacityDiagnostics.value = [];
    capacityError.value = '';
    let operation = version;
    try {
      const week = monday(capacityWeek.value);
      capacityWeek.value = week;
      operation = version;
      const current = () => operation === version;
      const mu = config.managementUnit.value;
      const agents = config.agents.value;
      if (!Array.isArray(agents)) throw Error('Medewerkers hebben geen geldige identificatie.');
      const entries: unknown[] = agents;
      const roster = entries.map((value) => {
        if (!object(value) || typeof value.id !== 'string' || !value.id)
          throw Error('Medewerkers hebben geen geldige identificatie.');
        return { id: value.id, name: typeof value.name === 'string' ? value.name : value.id };
      });
      if (!roster.length) {
        capacityProgress.value = 'Geen medewerkers gevonden.';
        return;
      }
      capacityProgress.value = 'Weekgebonden Work Plans ophalen…';
      const details = createWorkPlanDetailsLoader(config.request, mu);
      let assignments = new Map<string, string>(),
        warnings = new Map<string, string>();
      try {
        const queried = await queryAgentWorkPlans(
          config.request,
          mu,
          roster.map((a) => a.id),
          week,
        );
        if (!current()) return;
        assignments = queried.assignments;
        warnings = queried.warnings;
        if (queried.warning) capacityDiagnostics.value.push(queried.warning);
      } catch (error) {
        if (!current()) return;
        const reason = error instanceof Error ? error.message : 'Work Plan-query mislukt.';
        capacityDiagnostics.value.push(reason);
        warnings = new Map(roster.map((a) => [a.id, reason]));
      }
      const previousDate = new Date(week + 'T12:00:00Z');
      previousDate.setUTCDate(previousDate.getUTCDate() - 7);
      let previousAssignments = new Map<string, string>();
      let previousError = 'Work Plan-toewijzing van de vorige week ontbreekt.';
      try {
        const previous = await queryAgentWorkPlans(
          config.request,
          mu,
          roster.map((a) => a.id),
          previousDate.toISOString().slice(0, 10),
        );
        if (!current()) return;
        previousAssignments = previous.assignments;
      } catch (error) {
        if (!current()) return;
        previousError = error instanceof Error ? error.message : previousError;
      }
      const results: CapacityRow[] = new Array(roster.length);
      let index = 0;
      async function worker() {
        while (index < roster.length) {
          const i = index++,
            agent = roster[i];
          if (!current()) return;
          const row: CapacityRow = {
            ...agent,
            planName: 'Niet vastgesteld',
            space: unknownSpace(warnings.get(agent.id) ?? 'Work Plan-toewijzing ontbreekt.'),
          };
          const id = assignments.get(agent.id);
          if (id) {
            try {
              const plan = await details(id);
              if (!current()) return;
              row.planName = typeof plan.name === 'string' ? plan.name : 'Work Plan';
              // Request padding for boundary-spanning spans; retain full periods.
              const from = new Date(week + 'T00:00:00Z'),
                to = new Date(week + 'T00:00:00Z');
              from.setUTCDate(from.getUTCDate() - 1);
              to.setUTCDate(to.getUTCDate() + 8);
              const unavailable = await config.request(
                `/api/v2/workforcemanagement/agents/${encodeURIComponent(agent.id)}/unavailabletimes/query`,
                'POST',
                { startDate: from.toISOString(), endDate: to.toISOString() },
              );
              if (!current()) return;
              const previousId = previousAssignments.get(agent.id);
              const periods = unavailablePeriods(unavailable);
              let previousPlan: Record<string, unknown> | undefined;
              let boundaryError = previousError;
              if (previousId) {
                try {
                  previousPlan = await details(previousId);
                } catch (error) {
                  boundaryError = error instanceof Error ? error.message : previousError;
                }
              }
              if (!current()) return;
              row.space = previousPlan
                ? calculatePlanningSpace(plan, week, periods, previousPlan)
                : { ...unknownSpace(boundaryError), paid: workPlanHours(plan) };
            } catch (error) {
              row.space = unknownSpace(
                error instanceof Error
                  ? error.message
                  : 'Work Plan of onbeschikbaarheid kon niet worden opgehaald.',
              );
            }
          }
          if (!current()) return;
          results[i] = row;
          capacityRows.value = results.filter(Boolean);
          capacityProgress.value = `${capacityRows.value.length} van ${roster.length} medewerkers verwerkt`;
          // Let selection changes and the screen update between bounded calculations.
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, roster.length) }, () => worker()));
      if (current())
        capacityProgress.value = `${capacityRows.value.length} medewerkers geladen · week ${week}`;
    } catch (error) {
      if (operation === version)
        capacityError.value =
          error instanceof Error ? error.message : 'Capaciteit kon niet worden berekend.';
    } finally {
      capacityBusy.value = false;
    }
  }
  return {
    capacityMargin,
    capacityWeek,
    capacityBusy,
    capacityProgress,
    capacityError,
    capacityRows,
    capacityDiagnostics,
    loadCapacity,
    invalidateCapacity,
  };
}
