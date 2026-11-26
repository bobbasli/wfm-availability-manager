import { describe, expect, it } from 'vitest';
import {
  compareAvailability,
  readOriginalAvailability,
} from '../src/helpers/availabilityComparison';
import { mondayOfWeek, addCalendarDays } from '../src/helpers/week';

const block = (startDate: string, lengthMinutes: number) => ({
  timeSpan: { startDate, lengthMinutes },
});
const original = (values: unknown[]) =>
  readOriginalAvailability({
    consideredInScheduleGeneration: true,
    scheduleGenerationUnavailableTimes: values,
  });
describe('Original versus Latest Saved', () => {
  it('toont gewijzigde en gelijke tijdvakken per Amsterdamse dag', () => {
    const before = original([block('2026-11-09T08:00:00Z', 60)]);
    const days = compareAvailability(
      before,
      { entities: [block('2026-11-09T09:00:00Z', 60)] },
      '2026-11-09',
    );
    expect(days[0]).toMatchObject({
      original: '09:00–10:00',
      latest: '10:00–11:00',
      difference: 'Gewijzigd',
    });
    expect(days[1]).toMatchObject({
      original: 'Beschikbaar',
      latest: 'Beschikbaar',
      difference: 'Gelijk',
    });
  });
  it('interpreteert false met een lege lijst nooit als oorspronkelijke volledige beschikbaarheid', () => {
    const before = readOriginalAvailability({
      consideredInScheduleGeneration: false,
      scheduleGenerationUnavailableTimes: [],
    });
    expect(before).toMatchObject({ considered: false, periods: null });
    expect(compareAvailability(before, { entities: [] }, '2026-11-09')[0]).toMatchObject({
      original: 'Niet gebruikt (Not Used)',
      latest: 'Beschikbaar',
      difference: 'Niet te vergelijken',
    });
  });
  it.each([
    null,
    {},
    { consideredInScheduleGeneration: 'true', scheduleGenerationUnavailableTimes: [] },
    { consideredInScheduleGeneration: true },
    { consideredInScheduleGeneration: true, scheduleGenerationUnavailableTimes: [{}] },
  ])('weigert onbekende Original-data %j', (value) => {
    const days = compareAvailability(
      readOriginalAvailability(value),
      { entities: [] },
      '2026-11-09',
    );
    expect(days.every((day) => day.difference === 'Niet te vergelijken')).toBe(true);
  });
  it('toont onbekende Latest Saved niet als beschikbaar en blokkeert Original niet', () => {
    const days = compareAvailability(original([]), { unexpected: [] }, '2026-11-09');
    expect(days[0]).toMatchObject({
      original: 'Beschikbaar',
      latest: 'Gegevens niet beschikbaar',
      difference: 'Niet te vergelijken',
    });
  });
  it('verenigt overlap en vergelijkt perioden in plaats van blok-ID of notitie', () => {
    const days = compareAvailability(
      original([block('2026-11-09T08:00:00Z', 60), block('2026-11-09T08:30:00Z', 60)]),
      {
        entities: [
          { ...block('2026-11-09T08:00:00Z', 90), id: 'synthetic', notes: 'Andere notitie' },
        ],
      },
      '2026-11-09',
    );
    expect(days[0]).toMatchObject({
      original: '09:00–10:30',
      latest: '09:00–10:30',
      difference: 'Gelijk',
    });
  });
  it('knipt nachten en inkomende/uitgaande weekgrenzen op Amsterdamse kalenderdagen', () => {
    const values = [block('2026-11-08T22:30:00Z', 120), block('2026-11-15T22:30:00Z', 120)];
    const days = compareAvailability(original(values), { entities: values }, '2026-11-09');
    expect(days).toHaveLength(7);
    expect(days[0].original).toBe('00:00–01:30');
    expect(days[6].original).toBe('23:30–24:00');
    expect(days.every((day) => day.difference === 'Gelijk')).toBe(true);
  });
  it('behoudt echte tijdsduur tijdens de zomertijdsprong', () => {
    const values = [block('2026-03-29T00:30:00Z', 120)];
    expect(
      compareAvailability(original(values), { entities: values }, '2026-03-23')[6],
    ).toMatchObject({ original: '01:30–04:30', difference: 'Gelijk' });
  });
  it('vergelijkt offsets als instants en wijst tijden zonder offset af', () => {
    const before = original([block('2026-11-09T09:00:00+01:00', 60)]);
    expect(
      compareAvailability(
        before,
        { entities: [block('2026-11-09T08:00:00Z', 60)] },
        '2026-11-09',
      )[0].difference,
    ).toBe('Gelijk');
    expect(original([block('2026-11-09T09:00:00', 60)]).periods).toBeNull();
  });
});
describe('maandag tot zondag over kalendergrenzen', () => {
  it.each([
    ['2027-01-01', '2026-12-28'],
    ['2026-12-31', '2026-12-28'],
    ['2026-11-01', '2026-10-26'],
    ['2027-01-04', '2027-01-04'],
  ])('normaliseert %s', (date, monday) => expect(mondayOfWeek(date)).toBe(monday));
  it('gaat met zeven kalenderdagen naar het volgende jaar', () =>
    expect(addCalendarDays('2026-12-28', 7)).toBe('2027-01-04'));
});
