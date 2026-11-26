import { isRecord as record } from '../helpers/response';
import type { EntityHistory, ScheduleHistory, AvailabilityHistory } from '../types/history';
export type { EntityHistory, ScheduleHistory, AvailabilityHistory } from '../types/history';
export const unavailableHistoryReason =
  'De bestaande Unavailable Times-response bevat geen gedocumenteerde aanmaakdatum, wijzigingsdatum of verantwoordelijke gebruiker per blok.';
export const publicationHistoryReason =
  'De bestaande roostermetadata bevat geen eerste publicatiedatum. De aanmaakdatum is geen vervanging voor publicatie.';

/** Accept only absolute ISO instants, never a local date, startDate or current time. */
export function readTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/,
  );
  if (!match) return null;
  const [, year, month, day, hour, minute, second, zone] = match;
  const y = Number(year),
    m = Number(month),
    d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    y < 1 ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > days[m - 1] ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  )
    return null;
  if (
    zone !== 'Z' &&
    (Number(zone.slice(1, 3)) > 14 ||
      Number(zone.slice(4)) > 59 ||
      (Number(zone.slice(1, 3)) === 14 && Number(zone.slice(4)) !== 0))
  )
    return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? new Date(instant).toISOString() : null;
}
const formatter = new Intl.DateTimeFormat('nl-NL', {
  timeZone: 'Europe/Amsterdam',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
export function formatHistoryTimestamp(value: unknown): string {
  const timestamp = readTimestamp(value);
  if (!timestamp) return 'Niet beschikbaar';
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(timestamp))
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute}`;
}
function entityHistory(value: unknown): EntityHistory {
  if (!record(value)) return { createdAt: null, modifiedAt: null };
  const createdAt = readTimestamp(value.dateCreated),
    modifiedAt = readTimestamp(value.dateModified);
  if (createdAt && modifiedAt && Date.parse(modifiedAt) < Date.parse(createdAt))
    return { createdAt: null, modifiedAt: null };
  return { createdAt, modifiedAt };
}
export function readScheduleHistory(
  metadata: unknown,
  response: unknown,
  agentId: string,
  scheduleId: string,
): ScheduleHistory {
  const empty: ScheduleHistory = {
    createdAt: null,
    modifiedAt: null,
    firstPublishedAt: null,
    agentModifiedAt: null,
  };
  // Scope all values to a successfully loaded, identified schedule. No list fallback.
  if (!scheduleId || !record(metadata) || metadata.id !== scheduleId) return empty;
  const dates = entityHistory(metadata.metadata);
  const payload = record(response) && record(response.result) ? response.result : response;
  const rows =
    record(payload) && Array.isArray(payload.agentSchedules) ? payload.agentSchedules : [];
  const selected = rows.filter(
    (row: unknown) => record(row) && record(row.user) && row.user.id === agentId,
  );
  const agent =
    agentId && selected.length === 1 && record(selected[0])
      ? entityHistory(selected[0].metadata)
      : { modifiedAt: null };
  return { ...empty, ...dates, agentModifiedAt: agent.modifiedAt };
}
export function readAvailabilityHistory(_block: unknown): AvailabilityHistory {
  // UnavailableTime documents id/timeSpan/notes only. Ignore guessed metadata,
  // owner IDs, timeSpan.startDate and listing timestamps, even if supplied.
  return { createdAt: null, modifiedAt: null, modifiedBy: null };
}
/** Comparison policy for verified history only; existing endpoint gaps stay null.
 * First publication / availability events can only be supplied by a future
 * separately validated adapter, not guessed from the existing response.
 */
export function compareHistory(block: AvailabilityHistory, schedule: ScheduleHistory): string[] {
  const messages: string[] = [];
  const created = readTimestamp(block.createdAt),
    published = readTimestamp(schedule.firstPublishedAt);
  if (created && published) {
    const delta = Date.parse(created) - Date.parse(published);
    messages.push(
      delta < 0
        ? 'Dit blok is vóór de eerste roosterpublicatie aangemaakt.'
        : delta > 0
          ? 'Dit blok is na de eerste roosterpublicatie aangemaakt.'
          : 'Dit blok is op hetzelfde tijdstip als de eerste roosterpublicatie aangemaakt.',
    );
  }
  const modified = readTimestamp(block.modifiedAt),
    agent = readTimestamp(schedule.agentModifiedAt),
    global = readTimestamp(schedule.modifiedAt);
  const reference = agent ?? global;
  if (modified && reference && Date.parse(modified) > Date.parse(reference))
    messages.push(
      agent
        ? 'Dit blok is gewijzigd na de laatste wijziging van het rooster van de geselecteerde medewerker.'
        : 'Dit blok is gewijzigd na de laatste roosterbrede wijziging. Een afzonderlijke wijzigingsdatum voor deze medewerker is niet beschikbaar.',
    );
  return messages;
}
