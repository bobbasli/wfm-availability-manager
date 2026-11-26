// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref } from 'vue';
import { useCapacity } from '../src/composables/useCapacity';
import CapacityTable from '../src/components/CapacityTable.vue';
afterEach(() => localStorage.clear());
it('wijzigt marge, percentages en kleuren zonder enige nieuwe API-call', async () => {
  localStorage.clear();
  const request = vi.fn(async (path: string, _method?: string, body?: unknown) => {
    if (path.endsWith('/agents/workplans/query'))
      return {
        result: {
          referenceStartWeekDate: (body as { startDate: string }).startDate,
          entities: [{ user: { id: 'synthetic' }, workPlanLookupKeysPerWeek: [0] }],
          workPlanLookup: { '0': { id: 'plan' } },
        },
      };
    if (path.endsWith('/workplans/plan'))
      return {
        id: 'plan',
        weeklyExactPaidMinutes: 1440,
        shifts: [
          {
            days: { values: ['Monday', 'Tuesday', 'Wednesday'] },
            exactStartTimeMinutesFromMidnight: 540,
            exactPaidTimeMinutes: 480,
          },
        ],
      };
    return { entities: [] };
  });
  const root = document.createElement('div');
  let state!: ReturnType<typeof useCapacity>;
  const app = createApp({
    setup() {
      state = useCapacity({
        request,
        businessUnit: ref('bu'),
        managementUnit: ref('mu'),
        token: ref('synthetic-token'),
        agents: ref([{ id: 'synthetic', name: 'Test' }]),
      });
      return () =>
        h(CapacityTable, { rows: state.capacityRows.value, margin: state.capacityMargin.value });
    },
  });
  app.mount(root);
  try {
    await state.loadCapacity();
    await nextTick();
    expect(state.capacityMargin.value).toBe(25);
    expect(root.querySelector('tbody')?.textContent).toContain('80%');
    expect(root.querySelector('tbody .text-amber-700')).not.toBeNull();
    const calls = request.mock.calls.length,
      original = state.capacityRows.value;
    state.capacityMargin.value = 0;
    await nextTick();
    expect(root.querySelector('tbody')?.textContent).toContain('100%');
    expect(root.querySelector('tbody .text-emerald-700')).not.toBeNull();
    state.capacityMargin.value = 100;
    await nextTick();
    expect(root.querySelector('tbody')?.textContent).toContain('50%');
    expect(root.querySelector('tbody .text-amber-700')).not.toBeNull();
    state.capacityMargin.value = '';
    await nextTick();
    expect(root.querySelector('tbody td:last-child .font-semibold')).toBeNull();
    expect(root.querySelector('tbody')?.textContent).toContain('Kies een planningsmarge');
    expect(request).toHaveBeenCalledTimes(calls);
    expect(state.capacityRows.value).toBe(original);
    expect(localStorage.getItem('wfm_capacity_margin')).toBe('100');
    expect(request.mock.calls.filter(([path]) => path.endsWith('/workplans/plan'))).toHaveLength(1);
  } finally {
    app.unmount();
  }
});
it.each(['0', '50', 'garbage', '-1', '101', ''])(
  'leest opgeslagen marge %s veilig in',
  (stored) => {
    localStorage.setItem('wfm_capacity_margin', stored);
    let state!: ReturnType<typeof useCapacity>;
    const app = createApp({
      setup() {
        state = useCapacity({
          request: vi.fn(),
          businessUnit: ref(''),
          managementUnit: ref(''),
          token: ref(''),
          agents: ref([]),
        });
        return () => h('div');
      },
    });
    app.mount(document.createElement('div'));
    try {
      expect(state.capacityMargin.value).toBe(stored === '0' ? 0 : stored === '50' ? 50 : 25);
    } finally {
      app.unmount();
    }
  },
);
