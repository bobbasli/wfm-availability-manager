import type { ApiDiagnostic, GenesysApiMethod, GenesysEntity } from '../types/genesys';
export interface GenesysApiConfig {
  region: () => string;
  token: () => string;
  onUnauthorized: () => void;
  onResponse: (diagnostic: ApiDiagnostic) => void;
}
export type RequestFunction = <T = any>(path: string, method?: GenesysApiMethod, body?: unknown) => Promise<T>;
const readMessage = (response: unknown): string => {
  if (typeof response === 'object' && response !== null) {
    const data = response as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
  }
  return JSON.stringify(response).slice(0, 250);
};
export function createGenesysApi(config: GenesysApiConfig) {
  const request: RequestFunction = async <T = any>(path: string, method: GenesysApiMethod = 'GET', body?: unknown): Promise<T> => {
    const response = await fetch(`https://api.${config.region()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${config.token()}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) as unknown : {}; } catch { data = { raw: text }; }
    config.onResponse({ status: response.status, method, path, response: data });
    if (response.status === 401) config.onUnauthorized();
    if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} – ${readMessage(data)}`);
    return data as T;
  };
  const pages = async <T extends GenesysEntity = GenesysEntity>(path: string): Promise<T[]> => {
    const entities: T[] = [];
    for (let page = 1; page <= 50; page += 1) {
      const url = new URL(path, `https://api.${config.region()}`);
      url.searchParams.set('pageSize', '100');
      url.searchParams.set('pageNumber', String(page));
      const data = await request<{ entities?: T[]; results?: T[]; items?: T[]; pageCount?: number }>(url.pathname + url.search);
      const items = data.entities ?? data.results ?? data.items ?? [];
      if (!Array.isArray(items)) throw new Error('Onverwachte pagineringresponse van Genesys Cloud.');
      entities.push(...items);
      if (items.length < 100 || (data.pageCount !== undefined && page >= data.pageCount)) break;
    }
    return entities;
  };
  return { request, pages };
}
