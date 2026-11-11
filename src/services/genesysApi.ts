import { validateRegion } from './regions';
import type { ApiDiagnostic, GenesysApiMethod, GenesysEntity } from '../types/genesys';
export interface GenesysApiConfig {
  region: () => string;
  token: () => string;
  onUnauthorized: () => void;
  onResponse: (diagnostic: ApiDiagnostic) => void;
}
export type RequestFunction = (path: string, method?: GenesysApiMethod, body?: unknown) => Promise<unknown>;
const readMessage = (response: unknown): string => {
  if (typeof response === 'object' && response !== null) {
    const data = response as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
  }
  return JSON.stringify(response).slice(0, 250);
};
export function createGenesysApi(config: GenesysApiConfig) {
  const request: RequestFunction = async (path: string, method: GenesysApiMethod = 'GET', body?: unknown): Promise<unknown> => {
    const region = validateRegion(config.region());
    const token = config.token();
    if (!token) throw new Error('Meld je opnieuw aan bij Genesys Cloud.');
    if (!path.startsWith('/api/v2/') || path.includes('://') || path.includes('\\')) throw new Error('Ongeldig Genesys API-pad.');
    const destination=new URL(path, `https://api.${region}`);
    if(destination.origin !== `https://api.${region}` || !destination.pathname.startsWith('/api/v2/')) throw new Error('Ongeldig Genesys API-pad.');
    const response = await fetch(destination.href, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) as unknown : {}; } catch { data = { raw: text }; }
    if (config.token() !== token || config.region() !== region) throw new Error('Sessie gewijzigd tijdens ophalen.');
    config.onResponse({ status: response.status, method, path, response: data });
    if (response.status === 401 && config.token() === token && config.region() === region) config.onUnauthorized();
    if (response.status === 429) throw new Error(`Genesys-verzoeklimiet bereikt. Probeer opnieuw${response.headers.get('Retry-After') ? ' na '+response.headers.get('Retry-After')+' seconden' : ' na een korte wachttijd'}.`);
    if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} – ${readMessage(data)}`);
    if (!data || typeof data !== 'object') throw new Error('Onverwachte Genesys API-response.');
    return data;
  };
  const pages = async (path: string): Promise<GenesysEntity[]> => {
    const entities: GenesysEntity[] = [];
    const region = validateRegion(config.region());
    const token = config.token();
    for (let page = 1; page <= 50; page += 1) {
      if (region !== config.region() || token !== config.token()) throw new Error('Sessie gewijzigd tijdens ophalen.');
      const url = new URL(path, `https://api.${region}`);
      url.searchParams.set('pageSize', '100');
      url.searchParams.set('pageNumber', String(page));
      const data = await request(url.pathname + url.search);
      if (!isRecord(data)) throw new Error('Onverwachte pagineringresponse van Genesys Cloud.');
      const items = data.entities ?? data.results ?? data.items;
      if (!Array.isArray(items) || !items.every(isEntity)) throw new Error('Onverwachte pagineringresponse van Genesys Cloud.');
      const count = data.pageCount;
      if (count !== undefined && (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || (count < page && !(count === 0 && page === 1 && items.length === 0)))) throw new Error('Ongeldig pagina-aantal van Genesys Cloud.');
      entities.push(...items);
      if (count !== undefined ? page >= count : items.length < 100) return entities;
    }
    throw new Error('Pagineringlimiet bereikt; resultaten zijn onvolledig.');
  };
  return { request, pages };
}
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isEntity = (value: unknown): value is GenesysEntity => isRecord(value) && typeof value.id === 'string' && value.id.length > 0;

export async function exchangeOAuthCode(region: string, body: URLSearchParams): Promise<string> {
  const response = await fetch(`https://login.${validateRegion(region)}/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const data: unknown = await response.json();
  if (!response.ok) throw new Error(`OAuth-tokenuitwisseling mislukt (HTTP ${response.status}).`);
  if (!isRecord(data) || typeof data.access_token !== 'string' || !data.access_token || data.token_type?.toString().toLowerCase() !== 'bearer') throw new Error('Ongeldige OAuth-tokenresponse.');
  return data.access_token;
}
