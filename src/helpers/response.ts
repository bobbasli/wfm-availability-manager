export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function object(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Onbekende fout.';
}
export function responseList(value: unknown, keys: string[]): unknown[] | null {
  if (Array.isArray(value)) return value;
  const record = object(value);
  const list = keys.map((key) => record[key]).find((item) => item !== undefined && item !== null);
  return Array.isArray(list) ? list : null;
}
