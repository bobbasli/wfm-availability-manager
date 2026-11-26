import { computed, onMounted, ref, watch } from 'vue';
import { createGenesysApi } from '../services/genesysApi';
import { createAvailabilityService } from '../services/availability';
import { localDayBounds } from '../domain/time';
import {
  calendarDays,
  initialDateRange,
  unavailableRecords,
  unavailableSegments,
} from '../helpers/calendar';
import { errorMessage, object, text } from '../helpers/response';
import { useCapacity } from './useCapacity';
import { useGenesysSession } from './useGenesysSession';
import { usePublishedSchedules } from './usePublishedSchedules';
import { useUnavailableEditor } from './useUnavailableEditor';
import type { GenesysEntity } from '../types/genesys';
import type { ActiveTab, ScheduleDay } from '../types/availability';

/** Coordinates selection and cancellation; data access, auth and editor have separate owners. */
export function useAvailabilityManager() {
  const activeTab = ref<ActiveTab>('calendar');
  const identity = ref('Niet aangemeld');
  const businessUnits = ref<GenesysEntity[]>([]),
    managementUnits = ref<GenesysEntity[]>([]),
    agents = ref<GenesysEntity[]>([]);
  const businessUnit = ref(''),
    managementUnit = ref(''),
    agentId = ref('');
  const range = initialDateRange();
  const start = ref(range.start),
    end = ref(range.end);
  const lastResponse = ref<unknown>(null),
    raw = ref('Nog geen response.');
  const status = ref('Klaar.'),
    error = ref(false),
    busy = ref(false);
  const session = useGenesysSession(setStatus, resetSession);
  const { region, token } = session;
  const client = createGenesysApi({
    region: () => region.value,
    token: () => token.value,
    onUnauthorized: () => {
      session.logout();
      setStatus('Sessie verlopen; meld opnieuw aan.', true);
    },
    onResponse: (diagnostic) => {
      raw.value = JSON.stringify(diagnostic, null, 2);
    },
  });
  const service = createAvailabilityService(client.request, client.pages);
  const selection = { businessUnit, managementUnit, agentId, token, snapshot: selectionSnapshot };
  const schedules = usePublishedSchedules(selection, service);
  const capacity = useCapacity({
    businessUnit,
    managementUnit,
    token,
    agents,
    request: client.request,
  });
  const editor = useUnavailableEditor(
    {
      agentId,
      token,
      start,
      busy,
      agents,
      snapshot: selectionSnapshot,
      report: setStatus,
      refresh: loadUnavailable,
    },
    service,
  );
  const records = computed(() => unavailableRecords(lastResponse.value));
  const normalized = computed(() => unavailableSegments(lastResponse.value));
  const graphSupported = computed(() => lastResponse.value !== null && normalized.value !== null);
  const graphRows = computed(() => calendarDays(start.value, end.value, normalized.value ?? []));
  const scheduleRows = computed<ScheduleDay[]>(() =>
    graphRows.value.map((day) => ({
      ...day,
      shifts: schedules.segments.value.filter(
        (segment) => segment.date === day.date && segment.kind === 'shift',
      ),
      activities: schedules.segments.value.filter(
        (segment) => segment.date === day.date && segment.kind === 'activity',
      ),
    })),
  );
  let selectionVersion = 0,
    unavailableRequest = 0,
    managementRequest = 0,
    agentsRequest = 0;

  function selectionSnapshot() {
    const version = selectionVersion;
    return () => version === selectionVersion;
  }
  function setStatus(message: string, isError = false) {
    status.value = message;
    error.value = isError;
  }
  function resetSession() {
    managementRequest++;
    agentsRequest++;
    unavailableRequest++;
    busy.value = false;
    editor.closeEditor();
    schedules.clearSchedule();
    raw.value = 'Nog geen response.';
    capacity.capacityRows.value = [];
    activeTab.value = 'calendar';
    identity.value = 'Niet aangemeld';
    businessUnits.value = [];
    businessUnit.value = '';
    managementUnits.value = [];
    managementUnit.value = '';
    agents.value = [];
    agentId.value = '';
    lastResponse.value = null;
  }
  function resetAgentData() {
    unavailableRequest++;
    busy.value = false;
    lastResponse.value = null;
    schedules.clearSchedule();
    editor.closeEditor();
    if (agentId.value) {
      void loadUnavailable();
      void schedules.discoverSchedules();
    }
  }
  async function initialize() {
    if (!token.value) return;
    const valid = selectionSnapshot();
    busy.value = true;
    try {
      const me = await service.currentUser();
      if (!valid()) return;
      const units = await service.businessUnits();
      if (!valid()) return;
      identity.value = text(object(me).name) || 'Aangemeld';
      businessUnits.value = units;
      setStatus(`${units.length} Business Unit(s) geladen.`);
    } catch (error) {
      if (valid()) setStatus(errorMessage(error), true);
    } finally {
      if (valid()) busy.value = false;
    }
  }
  async function loadManagementUnits() {
    capacity.capacityRows.value = [];
    managementUnit.value = '';
    managementUnits.value = [];
    agents.value = [];
    agentId.value = '';
    resetAgentData();
    if (!businessUnit.value) return;
    const bu = businessUnit.value,
      request = ++managementRequest,
      valid = selectionSnapshot();
    const current = () =>
      valid() && bu === businessUnit.value && request === managementRequest && !!token.value;
    try {
      const list = await service.managementUnits(bu);
      if (!current()) return;
      managementUnits.value = list;
      setStatus(`${list.length} Management Unit(s) geladen.`);
    } catch (error) {
      if (current()) setStatus(errorMessage(error), true);
    }
  }
  async function loadAgents() {
    capacity.capacityRows.value = [];
    agents.value = [];
    agentId.value = '';
    resetAgentData();
    if (!managementUnit.value) return;
    const mu = managementUnit.value,
      bu = businessUnit.value,
      request = ++agentsRequest,
      valid = selectionSnapshot();
    const current = () =>
      valid() &&
      mu === managementUnit.value &&
      bu === businessUnit.value &&
      request === agentsRequest &&
      !!token.value;
    try {
      const list = await service.agents(mu);
      if (!current()) return;
      const loaded = list.map((agent) => ({
        ...agent,
        name: agent.name || text(object(agent.user).name || agent.userName || agent.displayName),
      }));
      const unresolved = loaded.filter((agent) => !agent.name || agent.name === agent.id);
      for (let index = 0; index < unresolved.length; index += 8) {
        if (!current()) return;
        await Promise.all(
          unresolved.slice(index, index + 8).map(async (agent) => {
            try {
              const user = object(await service.user(agent.id));
              agent.name = text(user.name || user.username) || agent.id;
            } catch {
              agent.name = agent.id;
            }
          }),
        );
      }
      if (!current()) return;
      agents.value = loaded.sort((a, b) => a.name.localeCompare(b.name, 'nl'));
      setStatus(`${loaded.length} medewerker(s) geladen.`);
    } catch (error) {
      if (current()) setStatus(errorMessage(error), true);
    }
  }
  async function loadUnavailable(): Promise<boolean | undefined> {
    if (!agentId.value || !token.value) return;
    const agent = agentId.value,
      valid = selectionSnapshot(),
      request = ++unavailableRequest;
    const current = () => valid() && request === unavailableRequest;
    busy.value = true;
    try {
      if (!start.value || !end.value || end.value < start.value)
        throw Error('Ongeldig datumbereik.');
      const response = await service.unavailable(agent, localDayBounds(start.value, end.value));
      if (!current()) return;
      lastResponse.value = response;
      setStatus('Unavailable Times opgehaald. Controleer eventueel de ruwe API-response.');
      return true;
    } catch (error) {
      if (current()) setStatus(errorMessage(error), true);
      return false;
    } finally {
      if (current()) busy.value = false;
    }
  }

  watch(
    [businessUnit, managementUnit, agentId, start, end, region, token],
    () => {
      selectionVersion++;
      editor.closeEditor();
      lastResponse.value = null;
      schedules.clearSchedule();
      busy.value = false;
    },
    { flush: 'sync' },
  );
  watch([start, end], () => {
    if (agentId.value) {
      void loadUnavailable();
      void schedules.discoverSchedules();
    }
  });
  onMounted(async () => {
    try {
      await session.callback();
      await initialize();
    } catch (error) {
      session.clearPendingLogin();
      setStatus(errorMessage(error), true);
      history.replaceState({}, '', session.redirect + location.hash);
    }
  });
  return {
    activeTab,
    identity,
    businessUnits,
    managementUnits,
    agents,
    businessUnit,
    managementUnit,
    agentId,
    start,
    end,
    lastResponse,
    raw,
    status,
    error,
    busy,
    records,
    graphRows,
    graphSupported,
    scheduleRows,
    ...session,
    ...schedules,
    ...capacity,
    ...editor,
    loadManagementUnits,
    loadAgents,
    resetAgentData,
    loadUnavailable,
  };
}
export type AvailabilityManager = ReturnType<typeof useAvailabilityManager>;
