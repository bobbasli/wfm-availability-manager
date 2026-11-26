import { computed, ref, watch } from 'vue';
import { readOriginalAvailability } from '../helpers/availabilityComparison';
import { readScheduleHistory } from '../domain/history';
import { isPublished } from '../domain/time';
import {
  activityCodesFromResponse,
  agentScheduleRows,
  scheduleSegments,
  scheduleWeekId,
} from '../helpers/schedules';
import { errorMessage, isRecord, responseList, text } from '../helpers/response';
import type { AvailabilityService } from '../services/availability';
import type { GenesysEntity } from '../types/genesys';
import type {
  ScheduleCandidate,
  ScheduleDiagnostic,
  SelectionContext,
} from '../types/availability';

export function usePublishedSchedules(context: SelectionContext, service: AvailabilityService) {
  const scheduleData = ref<unknown>(null);
  const scheduleError = ref('');
  const scheduleBusy = ref(false);
  const scheduleCandidates = ref<ScheduleCandidate[]>([]);
  const selectedSchedule = ref('');
  const scheduleDiagnostics = ref<ScheduleDiagnostic | null>(null);
  const scheduleState = ref('Selecteer een medewerker om het rooster op te halen.');
  const activityCodes = ref<GenesysEntity[]>([]);
  const activityCodeError = ref('');
  const segments = computed(() =>
    scheduleSegments(scheduleData.value, context.agentId.value, activityCodes.value),
  );
  const scheduleHistory = computed(() => {
    const loaded = scheduleDiagnostics.value;
    return readScheduleHistory(
      loaded?.scheduleId === selectedSchedule.value && loaded?.agentId === context.agentId.value
        ? loaded.metadata
        : null,
      scheduleData.value,
      context.agentId.value,
      selectedSchedule.value,
    );
  });
  const comparisonCandidates = ref<ScheduleCandidate[]>([]);
  const comparisonSchedule = ref('');
  const originalData = ref<unknown>(null);
  const originalBusy = ref(false),
    originalError = ref('');
  const originalAvailability = computed(() => readOriginalAvailability(originalData.value));
  let originalVersion = 0;
  let discoveryPending: { key: string; promise: Promise<void> } | null = null;
  let schedulePending: { key: string; promise: Promise<void> } | null = null;
  let requestVersion = 0;

  function clearSchedule() {
    requestVersion++;
    originalVersion++;
    discoveryPending = null;
    schedulePending = null;
    comparisonCandidates.value = [];
    comparisonSchedule.value = '';
    originalData.value = null;
    originalBusy.value = false;
    originalError.value = '';
    scheduleBusy.value = false;
    scheduleData.value = null;
    scheduleError.value = '';
    scheduleCandidates.value = [];
    selectedSchedule.value = '';
    scheduleDiagnostics.value = null;
    activityCodes.value = [];
    activityCodeError.value = '';
    scheduleState.value = 'Selecteer een medewerker om het rooster op te halen.';
  }
  async function loadActivityCodes() {
    activityCodes.value = [];
    activityCodeError.value = '';
    const valid = context.snapshot(),
      bu = context.businessUnit.value;
    if (!bu || !context.token.value) return;
    try {
      const result = await service.activityCodes(bu);
      if (valid()) activityCodes.value = activityCodesFromResponse(result);
    } catch (error) {
      if (valid())
        activityCodeError.value = `Activity Codes konden niet worden opgehaald: ${errorMessage(error)}`;
    }
  }
  async function runLoadSchedule() {
    scheduleData.value = null;
    scheduleDiagnostics.value = null;
    scheduleError.value = '';
    const candidate = scheduleCandidates.value.find((item) => item.id === selectedSchedule.value);
    const bu = context.businessUnit.value,
      mu = context.managementUnit.value,
      agent = context.agentId.value;
    if (!candidate || !bu || !mu || !agent) return;
    const valid = context.snapshot(),
      version = ++requestVersion;
    const current = () => valid() && version === requestVersion;
    scheduleBusy.value = true;
    scheduleState.value = 'Rooster en metadata ophalen…';
    try {
      const week = scheduleWeekId(candidate);
      if (!week)
        throw Error(
          'Geen weekdatum in weekDate of selfUri van dit rooster. Controleer de Rooster API-diagnose.',
        );
      candidate.weekId = week;
      const metadata = await service.schedule(bu, week, candidate.id);
      if (!isRecord(metadata) || !isPublished(metadata))
        throw Error('Rooster is niet expliciet gepubliceerd volgens de metadata.');
      if (!current()) return;
      scheduleDiagnostics.value = {
        scheduleId: candidate.id,
        agentId: agent,
        schedule: candidate.raw,
        resolvedWeekId: week,
        metadata,
      };
      const response = await service.agentSchedule(bu, week, candidate.id, mu, agent);
      if (!current()) return;
      scheduleData.value = response;
      scheduleDiagnostics.value = { ...scheduleDiagnostics.value, response };
      scheduleState.value = segments.value.length
        ? 'Rooster geladen.'
        : agentScheduleRows(response, agent).length
          ? 'Rooster opgehaald; geen diensten zichtbaar binnen de gekozen datums.'
          : 'Voor deze medewerker en week is geen gepubliceerd rooster beschikbaar.';
    } catch (error) {
      if (current()) {
        scheduleError.value = errorMessage(error);
        scheduleState.value = 'Rooster ophalen mislukt.';
      }
    } finally {
      if (current()) scheduleBusy.value = false;
    }
  }
  async function runDiscovery() {
    clearSchedule();
    if (!context.businessUnit.value || !context.agentId.value) return;
    const valid = context.snapshot(),
      version = ++requestVersion;
    const current = () => valid() && version === requestVersion;
    scheduleBusy.value = true;
    scheduleState.value = 'Gepubliceerde roosters zoeken…';
    void loadActivityCodes();
    try {
      const response = await service.schedules(context.businessUnit.value, context.week.value);
      if (!current()) return;
      const items = responseList(response, ['entities', 'schedules', 'results', 'items']);
      if (!items) throw Error('Roosterresponse heeft een onbekende structuur.');
      comparisonCandidates.value = items
        .filter(isRecord)
        .filter((item) => typeof item.id === 'string' && !!item.id)
        .map((item) => ({
          id: text(item.id),
          weekId: scheduleWeekId(item),
          name: text(item.name || item.description) || 'Rooster',
          raw: item,
        }));
      const eligible = items
        .filter(isRecord)
        .filter((item) => typeof item.id === 'string' && !!item.id && isPublished(item));
      scheduleCandidates.value = eligible.map((item) => ({
        id: text(item.id),
        weekId: scheduleWeekId(item),
        name: text(item.name || item.description) || 'Gepubliceerd rooster',
        raw: item,
      }));
      if (comparisonCandidates.value.length === 1)
        comparisonSchedule.value = comparisonCandidates.value[0].id;
      if (!eligible.length) {
        scheduleState.value =
          'Voor deze medewerker en week is geen gepubliceerd rooster beschikbaar.';
        return;
      }
      if (eligible.length === 1) {
        selectedSchedule.value = text(eligible[0].id);
        comparisonSchedule.value = selectedSchedule.value;
        await loadSchedule();
      } else
        scheduleState.value = `${eligible.length} gepubliceerde roosters gevonden. Kies het rooster voor deze week.`;
    } catch (error) {
      if (current()) {
        scheduleError.value = errorMessage(error);
        scheduleState.value = 'Rooster ophalen mislukt.';
      }
    } finally {
      if (current()) scheduleBusy.value = false;
    }
  }
  function requestKey() {
    return JSON.stringify([
      context.businessUnit.value,
      context.managementUnit.value,
      context.agentId.value,
      context.week.value,
    ]);
  }
  function discoverSchedules(): Promise<void> {
    const key = requestKey();
    if (discoveryPending?.key === key) return discoveryPending.promise;
    const promise = runDiscovery();
    discoveryPending = { key, promise };
    void promise.finally(() => {
      if (discoveryPending?.promise === promise) discoveryPending = null;
    });
    return promise;
  }
  function loadSchedule(): Promise<void> {
    const key = requestKey() + selectedSchedule.value;
    if (schedulePending?.key === key) return schedulePending.promise;
    const promise = runLoadSchedule();
    schedulePending = { key, promise };
    void promise.finally(() => {
      if (schedulePending?.promise === promise) schedulePending = null;
    });
    return promise;
  }
  async function loadOriginal() {
    const version = ++originalVersion,
      valid = context.snapshot(),
      id = comparisonSchedule.value;
    originalData.value = null;
    originalError.value = '';
    originalBusy.value = false;
    const candidate = comparisonCandidates.value.find((item) => item.id === id);
    if (!candidate || !context.agentId.value || !context.businessUnit.value || !context.token.value)
      return;
    const week = scheduleWeekId(candidate);
    if (!week) {
      originalError.value =
        'Original kan niet worden opgehaald: de startweek van het rooster ontbreekt.';
      return;
    }
    const current = () => version === originalVersion && valid() && comparisonSchedule.value === id;
    originalBusy.value = true;
    try {
      const response = await service.originalUnavailable(
        context.businessUnit.value,
        context.agentId.value,
        id,
        week,
      );
      if (current()) originalData.value = response;
    } catch (error) {
      if (current()) originalError.value = `Original ophalen mislukt: ${errorMessage(error)}`;
    } finally {
      if (current()) originalBusy.value = false;
    }
  }
  watch(
    comparisonSchedule,
    () => {
      void loadOriginal();
    },
    { flush: 'sync' },
  );
  watch(selectedSchedule, (id) => {
    if (comparisonCandidates.value.some((item) => item.id === id)) comparisonSchedule.value = id;
  });
  return {
    comparisonCandidates,
    comparisonSchedule,
    originalData,
    originalBusy,
    originalError,
    originalAvailability,
    scheduleData,
    scheduleError,
    scheduleBusy,
    scheduleCandidates,
    selectedSchedule,
    scheduleDiagnostics,
    scheduleState,
    activityCodes,
    activityCodeError,
    scheduleHistory,
    segments,
    loadSchedule,
    discoverSchedules,
    clearSchedule,
  };
}
