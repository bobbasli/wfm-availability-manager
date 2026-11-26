// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, type App } from 'vue';
import { useAvailabilityManager } from '../src/composables/useAvailabilityManager';

let app: App;
let manager: ReturnType<typeof useAvailabilityManager>;
const json = (value: unknown) => new Response(JSON.stringify(value));
const settle = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
  await nextTick();
};
const calls: { path: string; body: unknown; method: string }[] = [];
const emptyOriginal = {
  consideredInScheduleGeneration: false,
  scheduleGenerationUnavailableTimes: [],
};
beforeEach(async () => {
  sessionStorage.clear();
  localStorage.clear();
  calls.length = 0;
  sessionStorage.setItem('wfm_token', 'synthetic');
  sessionStorage.setItem('wfm_auth_context', JSON.stringify(['mypurecloud.de', '']));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = new URL(input).pathname;
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ path, body, method: init?.method ?? 'GET' });
      if (path.endsWith('/users/me')) return json({ name: 'Test' });
      if (path.endsWith('/unavailabletimes/schedules/query')) return json(emptyOriginal);
      if (path.endsWith('/schedules')) return json({ entities: [] });
      if (path.endsWith('/unavailabletimes/query'))
        return json({
          entities: [
            {
              id: 'synthetic-block',
              timeSpan: { startDate: '2026-12-28T08:00:00Z', lengthMinutes: 60 },
            },
          ],
        });
      if (path.endsWith('/agents/workplans/query'))
        return json({
          result: {
            referenceStartWeekDate: body.startDate,
            entities: [{ user: { id: 'agent-a' }, workPlanLookupKeysPerWeek: [0] }],
            workPlanLookup: { '0': { id: 'plan' } },
          },
        });
      if (path.endsWith('/workplans/plan'))
        return json({
          id: 'plan',
          name: 'Testplan',
          weeklyExactPaidMinutes: 480,
          shifts: [
            {
              days: { values: ['Monday'] },
              exactStartTimeMinutesFromMidnight: 480,
              exactPaidTimeMinutes: 480,
            },
          ],
        });
      return json({ entities: [] });
    }),
  );
  app = createApp({
    setup() {
      manager = useAvailabilityManager();
      return () => h('div');
    },
  });
  app.mount(document.createElement('div'));
  await settle();
  manager.businessUnit.value = 'bu';
  manager.managementUnit.value = 'mu';
  manager.agents.value = [
    { id: 'agent-a', name: 'Dezelfde naam' },
    { id: 'agent-b', name: 'Dezelfde naam' },
  ];
  manager.capacityWeek.value = '2026-12-28';
  await settle();
  calls.length = 0;
});
afterEach(() => {
  app.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('opent standaard capaciteit bij een geldige sessie', () =>
  expect(manager.activeTab.value).toBe('capacity'));
it('opent de medewerker op User-ID en neemt exact de geselecteerde week over, met één request per dataset', async () => {
  manager.openEmployeeCalendar('agent-b');
  await settle();
  expect(manager.activeTab.value).toBe('calendar');
  expect(manager.agentId.value).toBe('agent-b');
  expect(manager.start.value).toBe('2026-12-28');
  expect(manager.end.value).toBe('2027-01-03');
  expect(
    calls.filter((call) => call.path.includes('/agents/agent-b/unavailabletimes/query')),
  ).toHaveLength(1);
  expect(calls.filter((call) => call.path.endsWith('/weeks/2026-12-28/schedules'))).toHaveLength(1);
  expect(manager.scheduleState.value).toBe(
    'Voor deze medewerker en week is geen gepubliceerd rooster beschikbaar.',
  );
  expect(manager.graphSupported.value).toBe(true);
  expect(manager.graphRows.value[0].intervals).toHaveLength(1);
});
it('behoudt geladen capaciteit bij terugkeer en haalt schone gegevens niet opnieuw op', async () => {
  await manager.loadCapacity();
  const rows = manager.capacityRows.value;
  manager.openEmployeeCalendar('agent-a');
  await settle();
  const count = calls.length;
  manager.activeTab.value = 'capacity';
  await settle();
  expect(manager.capacityRows.value).toEqual(rows);
  expect(calls).toHaveLength(count);
  manager.openEmployeeCalendar('agent-a');
  await settle();
  expect(calls).toHaveLength(count);
});
it('coalescet snelle klikken en vorige/volgende week naar de laatste selectie', async () => {
  manager.openEmployeeCalendar('agent-a');
  manager.openEmployeeCalendar('agent-b');
  manager.moveWeek(1);
  await settle();
  expect(manager.capacityWeek.value).toBe('2027-01-04');
  expect(manager.start.value).toBe('2027-01-04');
  expect(manager.end.value).toBe('2027-01-10');
  expect(
    calls.filter((call) => call.path.includes('/agents/agent-a/unavailabletimes/query')),
  ).toHaveLength(0);
  expect(
    calls.filter((call) => call.path.includes('/agents/agent-b/unavailabletimes/query')),
  ).toHaveLength(1);
  expect(calls.filter((call) => call.path.endsWith('/weeks/2027-01-04/schedules'))).toHaveLength(1);
});
it('normaliseert een datumselectie naar dezelfde maandag in beide tabs', async () => {
  manager.capacityWeek.value = '2027-01-02';
  manager.openEmployeeCalendar('agent-a');
  await settle();
  expect(manager.capacityWeek.value).toBe('2026-12-28');
  expect(manager.start.value).toBe('2026-12-28');
});
it('laat latest saved zichtbaar als roosterophaling faalt', async () => {
  const originalFetch = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) =>
      input.includes('/schedules?')
        ? new Response('{}', { status: 403 })
        : originalFetch(input, init),
    ),
  );
  manager.openEmployeeCalendar('agent-a');
  await settle();
  expect(manager.graphSupported.value).toBe(true);
  expect(manager.scheduleError.value).toContain('403');
});
it('maakt succesvolle wijzigingen direct ongeldig voor capaciteit en ververst bij terugkeer', async () => {
  await manager.loadCapacity();
  manager.openEmployeeCalendar('agent-a');
  await settle();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  manager.openEditor(null);
  await manager.submitChange();
  expect(manager.capacityDirty.value).toBe(true);
  expect(manager.capacityRows.value).toEqual([]);
  const before = calls.filter((call) => call.path.endsWith('/agents/workplans/query')).length;
  manager.activeTab.value = 'capacity';
  await settle();
  await vi.waitFor(() => expect(manager.capacityBusy.value).toBe(false));
  expect(manager.capacityDirty.value).toBe(false);
  expect(calls.filter((call) => call.path.endsWith('/agents/workplans/query')).length).toBe(
    before + 2,
  );
});
it('laadt Original voor een ongepubliceerd rooster zonder ongepubliceerde diensten te laden', async () => {
  const originalFetch = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) =>
      input.includes('/weeks/2026-12-28/schedules?')
        ? json({
            entities: [{ id: 'draft', weekDate: '2026-12-28', published: false, name: 'Draft' }],
          })
        : originalFetch(input, init),
    ),
  );
  manager.openEmployeeCalendar('agent-a');
  await settle();
  expect(manager.selectedSchedule.value).toBe('');
  expect(manager.comparisonSchedule.value).toBe('draft');
  expect(manager.originalAvailability.value.considered).toBe(false);
  expect(
    calls.filter((call) => call.path.endsWith('/unavailabletimes/schedules/query')),
  ).toHaveLength(1);
  expect(
    calls.find((call) => call.path.endsWith('/unavailabletimes/schedules/query'))?.body,
  ).toEqual({ agentId: 'agent-a', schedule: { id: 'draft', weekDate: '2026-12-28' } });
  expect(calls.some((call) => call.path.includes('/agentschedules/query'))).toBe(false);
  expect(manager.availabilityComparison.value[0].difference).toBe('Niet te vergelijken');
});
it('negeert een late Latest Saved-response van de vorige medewerker', async () => {
  let resolve!: (response: Response) => void;
  const originalFetch = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input.includes('/agents/agent-a/unavailabletimes/query'))
        return new Promise<Response>((done) => {
          resolve = done;
        });
      return originalFetch(input, init);
    }),
  );
  manager.openEmployeeCalendar('agent-a');
  await settle();
  manager.openEmployeeCalendar('agent-b');
  await settle();
  resolve(
    json({ entities: [{ timeSpan: { startDate: '2026-12-28T00:00:00Z', lengthMinutes: 600 } }] }),
  );
  await settle();
  expect(manager.agentId.value).toBe('agent-b');
  expect(manager.graphRows.value[0].intervals[0].from).toBe(540);
});

it('laat de published metadata-, agentrooster- en Original-responses bij dezelfde medewerker en week horen', async () => {
  const originalFetch = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input.includes('/weeks/2026-12-28/schedules?'))
        return json({
          entities: [
            { id: 'published', weekDate: '2026-12-21', published: true, name: 'Tweeweeks rooster' },
          ],
        });
      if (input.endsWith('/schedules/published'))
        return json({
          id: 'published',
          published: true,
          metadata: { dateModified: '2026-12-22T12:00:00Z' },
        });
      if (input.endsWith('/agentschedules/query'))
        return json({
          result: {
            agentSchedules: [
              {
                user: { id: 'agent-a' },
                metadata: { dateModified: '2026-12-22T11:00:00Z' },
                shifts: [{ startDate: '2026-12-28T08:00:00Z', lengthMinutes: 60 }],
              },
            ],
          },
        });
      if (input.endsWith('/unavailabletimes/schedules/query')) {
        const body = JSON.parse(String(init?.body));
        expect(body).toEqual({
          agentId: 'agent-a',
          schedule: { id: 'published', weekDate: '2026-12-21' },
        });
        return json({
          consideredInScheduleGeneration: true,
          scheduleGenerationUnavailableTimes: [
            { timeSpan: { startDate: '2026-12-28T07:00:00Z', lengthMinutes: 60 } },
          ],
        });
      }
      return originalFetch(input, init);
    }),
  );
  manager.openEmployeeCalendar('agent-a');
  await settle();
  expect(manager.selectedSchedule.value).toBe('published');
  expect(manager.scheduleRows.value[0].shifts).toHaveLength(1);
  expect(manager.availabilityComparison.value[0]).toMatchObject({
    original: '08:00–09:00',
    latest: '09:00–10:00',
    difference: 'Gewijzigd',
  });
  expect(manager.scheduleHistory.value.agentModifiedAt).toBe('2026-12-22T11:00:00.000Z');
  expect(manager.scheduleHistory.value.firstPublishedAt).toBeNull();
});
it('houdt late Original-data van een vorige medewerker buiten de vergelijking', async () => {
  let resolve!: (response: Response) => void;
  const originalFetch = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input.includes('/weeks/2026-12-28/schedules?'))
        return json({ entities: [{ id: 'draft', weekDate: '2026-12-28', published: false }] });
      if (
        input.endsWith('/unavailabletimes/schedules/query') &&
        JSON.parse(String(init?.body)).agentId === 'agent-a'
      )
        return new Promise<Response>((done) => {
          resolve = done;
        });
      return originalFetch(input, init);
    }),
  );
  manager.openEmployeeCalendar('agent-a');
  await settle();
  manager.openEmployeeCalendar('agent-b');
  await settle();
  resolve(json({ consideredInScheduleGeneration: true, scheduleGenerationUnavailableTimes: [] }));
  await settle();
  expect(manager.agentId.value).toBe('agent-b');
  expect(manager.originalAvailability.value.considered).toBe(false);
});
it('laat rooster- en latest saved-data werken wanneer Original geen rechten heeft', async () => {
  const originalFetch = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input.includes('/weeks/2026-12-28/schedules?'))
        return json({ entities: [{ id: 'draft', weekDate: '2026-12-28', published: false }] });
      if (input.endsWith('/unavailabletimes/schedules/query'))
        return new Response('{}', { status: 403 });
      return originalFetch(input, init);
    }),
  );
  manager.openEmployeeCalendar('agent-a');
  await settle();
  expect(manager.originalError.value).toContain('403');
  expect(manager.graphSupported.value).toBe(true);
  expect(manager.availabilityComparison.value[0].latest).toBe('09:00–10:00');
});
it('ververst capaciteit niet wanneer de bevestiging van een wijziging wordt geannuleerd', async () => {
  await manager.loadCapacity();
  const rows = manager.capacityRows.value;
  manager.openEmployeeCalendar('agent-a');
  await settle();
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  manager.openEditor(null);
  await manager.submitChange();
  expect(manager.capacityDirty.value).toBe(false);
  expect(manager.capacityRows.value).toEqual(rows);
});

it('toont na een geslaagde PATCH geen oude Latest Saved-data als opnieuw ophalen mislukt', async () => {
  manager.openEmployeeCalendar('agent-a');
  await settle();
  const originalFetch = globalThis.fetch;
  let patched = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        patched = true;
        return json({});
      }
      if (patched && input.includes('/agents/agent-a/unavailabletimes/query'))
        return new Response('{}', { status: 503 });
      return originalFetch(input, init);
    }),
  );
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  manager.openEditor(null);
  await manager.submitChange();
  expect(manager.lastResponse.value).toBeNull();
  expect(manager.capacityDirty.value).toBe(true);
  expect(manager.availabilityComparison.value[0].latest).toBe('Gegevens niet beschikbaar');
});
