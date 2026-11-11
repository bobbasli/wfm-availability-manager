const timezone = 'Europe/Amsterdam';
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
export function localParts(milliseconds: number): {date: string; minute: number} {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(milliseconds))
    .filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return {date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour)*60+Number(parts.minute)};
}
const localDateTime = (milliseconds: number): string => {
  const parts = localParts(milliseconds);
  const hour = String(Math.floor(parts.minute/60)).padStart(2,'0');
  const minute = String(parts.minute%60).padStart(2,'0');
  return `${parts.date}T${hour}:${minute}`;
};
export function amsterdamToUtc(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw Error('Ongeldige lokale datum/tijd.');
  const naive = Date.parse(value+'Z');
  if (!Number.isFinite(naive)) throw Error('Ongeldige datum/tijd.');
  const candidates: number[] = [];
  for (let offset=-120;offset<=180;offset+=30) {
    const utc = naive-offset*60000;
    if (localDateTime(utc) === value) candidates.push(utc);
  }
  if (candidates.length !== 1) throw Error('Dit tijdstip bestaat niet of is dubbelzinnig door de overgang tussen zomer- en wintertijd. Kies een ander tijdstip.');
  return candidates[0];
}
export function localDayBounds(start: string, end: string): {startDate: string; endDate: string} {
  const day = new Date(end+'T12:00:00Z');
  if (!Number.isFinite(+day) || end < start) throw Error('Ongeldig datumbereik.');
  // Validate both supplied calendar dates before advancing to the next day.
  amsterdamToUtc(end+'T00:00');
  day.setUTCDate(day.getUTCDate()+1);
  return {
    startDate: new Date(amsterdamToUtc(start+'T00:00')).toISOString(),
    endDate: new Date(amsterdamToUtc(day.toISOString().slice(0,10)+'T00:00')).toISOString(),
  };
}
export function isPublished(schedule: Record<string, unknown>): boolean {
  const flag = schedule.published ?? schedule.isPublished ?? schedule.publicationStatus ?? schedule.status;
  return flag === true || (typeof flag === 'string' && flag.toLowerCase() === 'published');
}
