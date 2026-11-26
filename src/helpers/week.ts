export function addCalendarDays(date: string, count: number): string {
  const day = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(+day) || day.toISOString().slice(0, 10) !== date)
    throw Error('Kies een geldige datum.');
  day.setUTCDate(day.getUTCDate() + count);
  return day.toISOString().slice(0, 10);
}
export function mondayOfWeek(date: string): string {
  const valid = addCalendarDays(date, 0);
  const day = new Date(`${valid}T12:00:00Z`).getUTCDay();
  return addCalendarDays(valid, -(day + 6) % 7);
}
