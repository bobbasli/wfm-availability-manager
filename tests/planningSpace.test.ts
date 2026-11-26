import { describe, expect, it } from 'vitest';
import {
  calculatePlanningSpace,
  assessPlanningSpace,
  unknownSpace,
  type PlanningSpace,
} from '../src/domain/planningSpace';
import { amsterdamToUtc } from '../src/domain/time';
const week = '2026-11-09';
const plan = (paid = 24) => ({
  weeklyExactPaidMinutes: paid * 60,
  shifts: [
    {
      days: { values: ['Monday', 'Tuesday', 'Wednesday'] },
      exactStartTimeMinutesFromMidnight: 540,
      exactPaidTimeMinutes: 480,
    },
  ],
});
const span = (start: string, end: string): [number, number] => [
  amsterdamToUtc(start),
  amsterdamToUtc(end),
];
const data = (hours: number, paid = 24): PlanningSpace => ({
  paid: { min: paid, max: paid },
  windowHours: hours,
  blockedHours: 0,
  spaceHours: hours,
  reason: null,
});
describe('ruimtemarge en kleuren', () => {
  it.each([
    [20, 25, 66.6666666667, 'red'],
    [24, 25, 80, 'orange'],
    [30, 25, 100, 'green'],
    [50, 25, 166.6666666667, 'green'],
    [24, 0, 100, 'green'],
    [36, 50, 100, 'green'],
    [26.4, 10, 100, 'green'],
  ])('ruimte %s, marge %s', (space, margin, percentage, status) => {
    const result = assessPlanningSpace(data(Number(space)), Number(margin)).minimum!;
    expect(result.percentage).toBeCloseTo(Number(percentage));
    expect(result.status).toBe(status);
  });
  it('beoordeelt flexibele grenzen afzonderlijk zonder maximum als verplichting', () => {
    const result = assessPlanningSpace({ ...data(30), paid: { min: 24, max: 32 } }, 25);
    expect(result.minimum).toMatchObject({ percentage: 100, status: 'green', requiredHours: 30 });
    expect(result.maximum?.percentage).toBe(75);
    expect(result.maximum?.status).toBe('red');
  });
  it('toont geen percentage voor nul benodigde uren, ook binnen flexbereik', () => {
    expect(assessPlanningSpace(data(20, 0), 25).minimum?.percentage).toBeNull();
    const result = assessPlanningSpace({ ...data(30), paid: { min: 0, max: 24 } }, 25);
    expect(result.minimum?.status).toBe('unknown');
    expect(result.maximum?.percentage).toBe(100);
  });
  it.each([-1, 101, NaN, Infinity, '', '25', null])('weigert ongeldige marge %s', (margin) =>
    expect(assessPlanningSpace(data(30), margin).minimum).toBeNull(),
  );
  it('toont geen percentage bij onbekende toewijzing of ontbrekende uren', () => {
    expect(assessPlanningSpace(unknownSpace('Geen Work Plan'), 25).minimum).toBeNull();
    const result = calculatePlanningSpace(
      { ...plan(), weeklyExactPaidMinutes: null },
      week,
      [],
      plan(),
    );
    expect(result.spaceHours).toBe(24);
    expect(result.paid).toBeNull();
    expect(assessPlanningSpace(result, 25).minimum).toBeNull();
  });
});
describe('vensters en onbeschikbaarheid', () => {
  it('berekent vaste uren zonder eisen aan maximumdagen of pauzeplaatsing', () => {
    const result = calculatePlanningSpace(plan(), week, [], plan());
    expect(result).toMatchObject({
      paid: { min: 24, max: 24 },
      windowHours: 24,
      blockedHours: 0,
      spaceHours: 24,
      reason: null,
    });
  });
  it('berekent flexibele betaalde weekuren', () => {
    const flexible = {
      ...plan(),
      flexibleWeeklyPaidTime: true,
      weeklyMinimumPaidMinutes: 1440,
      weeklyMaximumPaidMinutes: 1920,
    };
    expect(calculatePlanningSpace(flexible, week, [], flexible).paid).toEqual({ min: 24, max: 32 });
  });
  it('verenigt overlappende inzetvensters en Unavailable Times', () => {
    const value = { ...plan(), shifts: [...plan().shifts, ...plan().shifts] };
    const result = calculatePlanningSpace(
      value,
      week,
      [span(week + 'T11:00', week + 'T13:00'), span(week + 'T12:00', week + 'T14:00')],
      value,
    );
    expect(result.windowHours).toBe(24);
    expect(result.blockedHours).toBe(3);
    expect(result.spaceHours).toBe(21);
  });
  it('trekt een gedeeltelijke blokkade alleen als tijd af, zonder dienstvalidatie', () => {
    expect(
      calculatePlanningSpace(plan(), week, [span(week + 'T12:00', week + 'T13:00')], plan())
        .spaceHours,
    ).toBe(23);
  });
  it('negeert onbeschikbaarheid buiten inzetvensters', () => {
    const result = calculatePlanningSpace(
      plan(),
      week,
      [span(week + 'T00:00', week + 'T08:00'), span('2026-11-12T12:00', '2026-11-12T18:00')],
      plan(),
    );
    expect(result.blockedHours).toBe(0);
    expect(result.spaceHours).toBe(24);
  });
  it('bepaalt een flexibele envelop in plaats van dienstcombinaties', () => {
    const value = {
      ...plan(),
      maximumDays: 1,
      shifts: [
        {
          days: { values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
          flexibleStartTime: true,
          earliestStartTimeMinutesFromMidnight: 480,
          latestStartTimeMinutesFromMidnight: 600,
          exactPaidTimeMinutes: 480,
        },
      ],
    };
    const result = calculatePlanningSpace(value, week, [], value);
    expect(result.spaceHours).toBe(50);
    expect(assessPlanningSpace(result, 25).minimum?.percentage).toBeCloseTo(166.6667);
  });
  it('houdt rekening met onbetaalde activiteitduur in de envelop', () => {
    const value = {
      ...plan(),
      shifts: [
        { ...plan().shifts[0], activities: [{ lengthMinutes: 30, countsAsPaidTime: false }] },
      ],
    };
    expect(calculatePlanningSpace(value, week, [], value).spaceHours).toBe(25.5);
  });
  it('verwerkt overnachtdiensten binnen de week', () => {
    const value = {
      ...plan(8),
      shifts: [
        {
          ...plan().shifts[0],
          days: { values: ['Monday'] },
          exactStartTimeMinutesFromMidnight: 1320,
        },
      ],
    };
    const result = calculatePlanningSpace(
      value,
      week,
      [span('2026-11-10T00:00', '2026-11-10T02:00')],
      value,
    );
    expect(result.spaceHours).toBe(6);
    expect(result.blockedHours).toBe(2);
  });
  it('gebruikt het vorige plan voor inkomende nachturen, en knipt uitgaande uren af', () => {
    const current = {
      ...plan(),
      shifts: [
        {
          ...plan().shifts[0],
          days: { values: ['Sunday'] },
          exactStartTimeMinutesFromMidnight: 1320,
        },
      ],
    };
    const previous = { ...plan(), shifts: [{ ...current.shifts[0], exactPaidTimeMinutes: 240 }] };
    const result = calculatePlanningSpace(current, week, [], previous);
    expect(result.spaceHours).toBe(4);
    const onlyCurrent = calculatePlanningSpace(current, week, [], plan());
    expect(onlyCurrent.spaceHours).toBe(2);
  });
  it.each([
    ['2026-03-23', 8],
    ['2026-10-19', 8],
  ])('zet lokale zondagtijd correct om rond DST %s', (selected, hours) => {
    const value = {
      ...plan(),
      shifts: [
        {
          ...plan().shifts[0],
          days: { values: ['Sunday'] },
          exactStartTimeMinutesFromMidnight: 540,
        },
      ],
    };
    expect(calculatePlanningSpace(value, String(selected), [], value).spaceHours).toBe(hours);
  });
  it.each([
    null,
    {},
    { shifts: [] },
    {
      weeklyExactPaidMinutes: 1440,
      shifts: [
        {
          days: { values: ['Monday'] },
          exactStartTimeMinutesFromMidnight: null,
          exactPaidTimeMinutes: 480,
        },
      ],
    },
  ])('toont onbekend bij ongeldige venstergegevens', (value) => {
    const result = calculatePlanningSpace(value, week, [], plan());
    expect(result.spaceHours).toBeNull();
    expect(result.reason).toBeTruthy();
  });
  it('verzint geen inkomende vensters bij ontbrekende vorige toewijzing', () => {
    expect(calculatePlanningSpace(plan(), week, [], null).spaceHours).toBeNull();
  });
});
it.each([
  ['2026-03-23', '2026-03-29', 1],
  ['2026-10-19', '2026-10-25', 3],
])('telt verstreken overlapuren tijdens DST in week %s', (week, date, blockedHours) => {
  const value = {
    ...plan(),
    shifts: [
      { ...plan().shifts[0], days: { values: ['Sunday'] }, exactStartTimeMinutesFromMidnight: 0 },
    ],
  };
  const result = calculatePlanningSpace(
    value,
    String(week),
    [span(date + 'T01:00', date + 'T03:00')],
    value,
  );
  expect(result.windowHours).toBe(8);
  expect(result.blockedHours).toBe(blockedHours);
  expect(result.spaceHours).toBe(8 - Number(blockedHours));
});

it('behoudt 47,5 uur en 95% bij vijf vensters 08:00–17:30; telt betaalde activiteiten niet dubbel', () => {
  const reference = {
    constrainWeeklyPaidTime: true,
    flexibleWeeklyPaidTime: false,
    weeklyExactPaidMinutes: 2400,
    weeklyMinimumPaidMinutes: 1440,
    weeklyMaximumPaidMinutes: 1920,
    shifts: [
      {
        days: { values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
        flexibleStartTime: true,
        exactStartTimeMinutesFromMidnight: 480,
        earliestStartTimeMinutesFromMidnight: 480,
        latestStartTimeMinutesFromMidnight: 540,
        flexiblePaidTime: false,
        exactPaidTimeMinutes: 480,
        minimumPaidTimeMinutes: 480,
        maximumPaidTimeMinutes: 480,
        activities: [
          { lengthMinutes: 15, countsAsPaidTime: true },
          { lengthMinutes: 30, countsAsPaidTime: false },
          { lengthMinutes: 15, countsAsPaidTime: true },
          { lengthMinutes: 60, countsAsPaidTime: true },
        ],
      },
    ],
  };
  const result = calculatePlanningSpace(reference, week, [], reference);
  expect(result).toMatchObject({
    paid: { min: 40, max: 40 },
    windowHours: 47.5,
    blockedHours: 0,
    spaceHours: 47.5,
  });
  expect(assessPlanningSpace(result, 25).minimum).toMatchObject({
    percentage: 95,
    status: 'orange',
  });
  expect(assessPlanningSpace(result, 0).minimum?.percentage).toBe(118.75);
});
