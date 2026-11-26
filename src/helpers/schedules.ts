import { localParts } from '../domain/time';
import { clockTime } from './calendar';
import { isRecord, object, responseList, text } from './response';
import type { GenesysEntity } from '../types/genesys';
import type { ScheduleSegment } from '../types/availability';

export function activityColor(value: unknown): string | null {
  const code = object(value);
  const candidate = object(code.style).backgroundColor ?? code.color;
  const details = object(candidate);
  const raw =
    (typeof candidate === 'string' ? candidate : details.hex || details.value || details.code) ||
    code.hexColor ||
    code.colorCode ||
    code.backgroundColor;
  if (typeof raw !== 'string') return null;
  const color = raw.trim();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i.test(color)) return color;
  if (/^[0-9a-f]{6}$/i.test(color)) return `#${color}`;
  if (
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color)
  )
    return color;
  return null;
}
export function activityCodesFromResponse(response: unknown): GenesysEntity[] {
  const payload = object(response).result ?? response;
  const record = object(payload);
  const source = Array.isArray(payload)
    ? payload
    : (record.entities ?? record.activityCodes ?? record.results ?? record.items ?? record.data);
  const entries = Array.isArray(source)
    ? source
    : isRecord(source)
      ? Object.entries(source).map(([id, value]) => ({ id, ...object(value) }))
      : null;
  if (!entries)
    throw Error(
      'Activity Codes-response heeft een onbekende structuur; rooster blijft beschikbaar.',
    );
  return entries.filter(
    (entry): entry is GenesysEntity =>
      isRecord(entry) && typeof entry.id === 'string' && !!entry.id,
  );
}
export function scheduleWeekId(value: unknown): string | null {
  const schedule = object(value),
    raw = object(schedule.raw);
  const candidates = [
    schedule.weekDate,
    raw.weekDate,
    schedule.weekId,
    raw.weekId,
    object(schedule.week).weekDate,
    object(raw.week).weekDate,
  ];
  for (const candidate of candidates)
    if (typeof candidate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  for (const uri of [schedule.selfUri, raw.selfUri]) {
    const match = typeof uri === 'string' && uri.match(/\/weeks\/(\d{4}-\d{2}-\d{2})\/schedules\//);
    if (match) return match[1];
  }
  return null;
}
export function agentScheduleRows(response: unknown, agentId: string): Record<string, unknown>[] {
  const payload = object(response).result ?? response;
  return (
    responseList(payload, ['agentSchedules', 'entities', 'results', 'items', 'schedules']) ?? []
  )
    .filter(isRecord)
    .filter(
      (row) =>
        (object(row.user).id || row.userId || object(row.agent).id || row.agentId) === agentId,
    );
}
function spanSegments(
  value: unknown,
  label: string,
  color: string | null,
  kind: ScheduleSegment['kind'],
): ScheduleSegment[] {
  const span = object(value);
  const start = Date.parse(
    text(span.startDate || span.startTime || span.start || span.startDateTime),
  );
  const finish = span.endDate || span.endTime || span.end || span.endDateTime;
  const end = finish ? Date.parse(text(finish)) : start + Number(span.lengthMinutes) * 60000;
  // Invalid or unbounded remote spans must not lock the browser in a minute loop.
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 525600 * 60000
  )
    return [];
  const result: ScheduleSegment[] = [];
  let current: ScheduleSegment | undefined;
  for (let time = start; time < end; time += 60000) {
    const local = localParts(time);
    if (!current || current.date !== local.date || current.to !== local.minute) {
      current = { date: local.date, from: local.minute, to: local.minute + 1, label, color, kind };
      result.push(current);
    } else current.to = local.minute + 1;
  }
  return result.map((segment) => ({
    ...segment,
    label: `${label} · ${clockTime(segment.from)}–${clockTime(segment.to)}`,
  }));
}
export function scheduleSegments(
  response: unknown,
  agentId: string,
  codes: GenesysEntity[],
): ScheduleSegment[] {
  const codeMap = new Map(codes.map((code) => [code.id, code]));
  return agentScheduleRows(response, agentId).flatMap((row) => {
    const shifts =
      responseList(row, ['shifts', 'shiftAssignments', 'scheduledShifts', 'shiftSegments']) ?? [];
    return shifts.flatMap((value) => {
      const shift = object(value);
      const segments = spanSegments(
        shift.timeSpan ?? shift,
        text(shift.name || object(shift.activityCode).name) || 'Roosterdienst',
        null,
        'shift',
      );
      for (const value of Array.isArray(shift.activities) ? shift.activities : []) {
        const activity = object(value),
          reference = object(activity.activityCode);
        const code = codeMap.get(String(activity.activityCodeId ?? reference.id ?? ''));
        const name =
          text(code?.name || code?.description || reference.name || activity.description) ||
          `Activity Code ${activity.activityCodeId ?? 'onbekend'}`;
        segments.push(...spanSegments(activity, name, activityColor(code), 'activity'));
      }
      return segments;
    });
  });
}
