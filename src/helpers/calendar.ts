import { localParts } from '../domain/time';
import { isRecord, object, responseList, text } from './response';
import type { CalendarDay, TimelineInterval, UnavailableBlock } from '../types/availability';

export const calendarDate = (date: Date): string => date.toISOString().slice(0, 10);
export const clockTime = (minute: number): string =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export function initialDateRange(): { start: string; end: string } {
  const monday = new Date(`${localParts(Date.now()).date}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const end = new Date(monday);
  end.setUTCDate(end.getUTCDate() + 27);
  return { start: calendarDate(monday), end: calendarDate(end) };
}
export function splitLocal(milliseconds: number): { date: string; time: string } {
  const parts = localParts(milliseconds);
  return { date: parts.date, time: clockTime(parts.minute) };
}
/** Preserve raw data for diagnostics, but only expose validated blocks to the editor. */
export function readUnavailableBlock(value: unknown): UnavailableBlock | null {
  if (!isRecord(value)) return null;
  const span = object(value.timeSpan);
  if (
    typeof span.startDate !== 'string' ||
    !Number.isFinite(Date.parse(span.startDate)) ||
    typeof span.lengthMinutes !== 'number' ||
    !Number.isInteger(span.lengthMinutes) ||
    span.lengthMinutes <= 0 ||
    span.lengthMinutes > 525600
  )
    return null;
  return {
    ...(typeof value.id === 'string' ? { id: value.id } : {}),
    timeSpan: { startDate: span.startDate, lengthMinutes: span.lengthMinutes },
    notes: text(value.notes),
  };
}
export function unavailableRecords(response: unknown): unknown[] | null {
  return responseList(response, ['entities', 'unavailableTimes', 'results', 'items', 'days']);
}
export function unavailableSegments(response: unknown): TimelineInterval[] | null {
  const records = unavailableRecords(response);
  if (!records) return null;
  const result: TimelineInterval[] = [];
  for (const value of records) {
    const original = readUnavailableBlock(value);
    if (!original) return null;
    const start = Date.parse(original.timeSpan.startDate);
    let current: TimelineInterval | undefined;
    for (let minute = 0; minute < original.timeSpan.lengthMinutes; minute++) {
      const local = localParts(start + minute * 60000);
      if (!current || current.date !== local.date || current.to !== local.minute) {
        current = {
          date: local.date,
          from: local.minute,
          to: local.minute + 1,
          label: '',
          original,
        };
        result.push(current);
      } else current.to = local.minute + 1;
    }
  }
  return result.map((interval) => ({
    ...interval,
    label: `${clockTime(interval.from)}–${clockTime(interval.to)}`,
  }));
}
export function calendarDays(
  start: string,
  end: string,
  intervals: TimelineInterval[],
): CalendarDay[] {
  const first = new Date(`${start}T12:00:00Z`),
    last = new Date(`${end}T12:00:00Z`);
  if (!Number.isFinite(+first) || !Number.isFinite(+last)) return [];
  const days: CalendarDay[] = [];
  for (
    let day = new Date(first), count = 0;
    day <= last && count < 62;
    day.setUTCDate(day.getUTCDate() + 1), count++
  ) {
    const date = calendarDate(day);
    days.push({
      date,
      label: new Intl.DateTimeFormat('nl-NL', {
        weekday: 'short',
        timeZone: 'Europe/Amsterdam',
      }).format(day),
      intervals: intervals.filter((interval) => interval.date === date),
    });
  }
  return days;
}
