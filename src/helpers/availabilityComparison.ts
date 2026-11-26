import { unionIntervals, type Interval } from '../domain/capacity';
import { readTimestamp } from '../domain/history';
import { amsterdamToUtc, localParts } from '../domain/time';
import { clockTime, readUnavailableBlock, unavailableRecords } from './calendar';
import { isRecord } from './response';
import { addCalendarDays } from './week';
import type { AvailabilityComparisonDay, OriginalAvailability } from '../types/availability';

export function comparisonPeriods(values: unknown): Interval[] | null {
  if (!Array.isArray(values)) return null;
  const periods: Interval[] = [];
  for (const value of values) {
    const block = readUnavailableBlock(value);
    if (!block || !readTimestamp(block.timeSpan.startDate)) return null;
    const start = Date.parse(block.timeSpan.startDate);
    periods.push([start, start + block.timeSpan.lengthMinutes * 60000]);
  }
  return unionIntervals(periods);
}
export function readOriginalAvailability(value: unknown): OriginalAvailability {
  if (!isRecord(value) || typeof value.consideredInScheduleGeneration !== 'boolean')
    return {
      considered: null,
      periods: null,
      reason: 'Original-response heeft geen geldige consideredInScheduleGeneration.',
    };
  if (!value.consideredInScheduleGeneration)
    return {
      considered: false,
      periods: null,
      reason:
        'Niet gebruikt bij roostergeneratie (Not Used). Geen uitspraak over oorspronkelijke beschikbaarheid.',
    };
  const periods = comparisonPeriods(value.scheduleGenerationUnavailableTimes);
  return {
    considered: true,
    periods,
    reason: periods === null ? 'Oorspronkelijke tijdvakken ontbreken of zijn ongeldig.' : null,
  };
}
function clipped(periods: Interval[], start: number, end: number): Interval[] {
  return unionIntervals(periods.map(([a, b]) => [Math.max(a, start), Math.min(b, end)]));
}
function label(periods: Interval[] | null, end: number): string {
  if (periods === null) return 'Gegevens niet beschikbaar';
  if (!periods.length) return 'Beschikbaar';
  return periods
    .map(
      ([a, b]) =>
        `${clockTime(localParts(a).minute)}–${b === end ? '24:00' : clockTime(localParts(b).minute)}`,
    )
    .join(', ');
}
export function compareAvailability(
  original: OriginalAvailability,
  latest: unknown,
  week: string,
): AvailabilityComparisonDay[] {
  let current: Interval[] | null = null;
  try {
    current = comparisonPeriods(unavailableRecords(latest));
  } catch {
    /* Unknown stays unknown. */
  }
  return Array.from({ length: 7 }, (_, offset) => {
    const date = addCalendarDays(week, offset),
      start = amsterdamToUtc(date + 'T00:00'),
      end = amsterdamToUtc(addCalendarDays(date, 1) + 'T00:00');
    const before =
      original.considered === true && original.periods !== null
        ? clipped(original.periods, start, end)
        : null;
    const after = current === null ? null : clipped(current, start, end);
    return {
      date,
      original: original.considered === false ? 'Niet gebruikt (Not Used)' : label(before, end),
      latest: label(after, end),
      difference:
        before === null || after === null
          ? 'Niet te vergelijken'
          : JSON.stringify(before) === JSON.stringify(after)
            ? 'Gelijk'
            : 'Gewijzigd',
    };
  });
}
