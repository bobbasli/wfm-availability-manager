import type { RequestFunction } from './genesysApi';

export interface AssignmentResult {
  assignments: Map<string, string>;
  warnings: Map<string, string>;
  warning: string | null;
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const weekMilliseconds = 7 * 24 * 60 * 60 * 1000;
function calendarDate(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const milliseconds = Date.parse(value+'T00:00:00Z');
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().slice(0,10) === value ? milliseconds : null;
}
function managementUnitPath(id: string): string {
  if (!nonempty(id)) throw Error('Management Unit-ID is verplicht voor Work Plan-verzoeken.');
  return `/api/v2/workforcemanagement/managementunits/${encodeURIComponent(id)}`;
}
function planIdFromLookup(value: unknown): string | null {
  if (!isRecord(value)) return null;
  // Both explicit ID representations are supported; disagreeing IDs are ambiguous.
  const ids = [value.id, value.workPlanId].filter(nonempty);
  return ids.length > 0 && new Set(ids).size === 1 ? ids[0] : null;
}
export function parseAgentWorkPlans(payload: unknown, agentIds: string[], startDate: string): AssignmentResult {
  const assignments = new Map<string,string>();
  const warnings = new Map(agentIds.map(id => [id,'Geen Work Plan-toewijzing voor deze medewerker in de gekozen week.']));
  const invalid = (message: string): AssignmentResult => ({assignments:new Map(), warnings:new Map(agentIds.map(id=>[id,message])), warning:message});
  if (!isRecord(payload) || !isRecord(payload.result)) return invalid('Onbekende Work Plan-response: result ontbreekt.');
  const result = payload.result;
  if (!Array.isArray(result.entities) || (!isRecord(result.workPlanLookup) && !Array.isArray(result.workPlanLookup))) return invalid('Ongeldige Work Plan-response: entities of workPlanLookup ontbreekt.');
  const reference = calendarDate(result.referenceStartWeekDate), selected = calendarDate(startDate);
  if (reference === null || selected === null) return invalid('Ongeldige referentie- of selectieweek in Work Plan-response.');
  const weekIndex = (selected-reference)/weekMilliseconds;
  if (!Number.isInteger(weekIndex) || weekIndex < 0) return invalid('De gekozen week valt buiten de Work Plan-resultaten of is niet uitgelijnd met de referentieweek.');
  const seen = new Set<string>();
  const knownAgents = new Set(agentIds);
  for (const entity of result.entities) {
    // Never identify an employee using entity.id, agentId, order, or display name.
    if (!isRecord(entity) || !isRecord(entity.user) || !nonempty(entity.user.id) || !knownAgents.has(entity.user.id)) continue;
    const agentId = entity.user.id;
    if (seen.has(agentId)) {
      assignments.delete(agentId);
      warnings.set(agentId,'Meerdere Work Plan-toewijzingen voor dezelfde medewerker; toewijzing is niet eenduidig.');
      continue;
    }
    seen.add(agentId);
    const keys = entity.workPlanLookupKeysPerWeek;
    if (!Array.isArray(keys) || weekIndex >= keys.length) {
      warnings.set(agentId,'Geen Work Plan-weekindex voor de gekozen week.');continue;
    }
    const key: unknown = keys[weekIndex];
    if (typeof key !== 'number' || !Number.isSafeInteger(key) || key < 0) {
      warnings.set(agentId,'Ontbrekende of ongeldige Work Plan-lookupsleutel voor de gekozen week.');continue;
    }
    const lookup = result.workPlanLookup;
    const entry: unknown = Object.prototype.hasOwnProperty.call(lookup,String(key)) ? (lookup as Record<string,unknown>)[String(key)] : undefined;
    const planId = planIdFromLookup(entry);
    if (!planId) {
      warnings.set(agentId,'Work Plan-lookupsleutel verwijst niet naar een eenduidig Work Plan-ID.');continue;
    }
    assignments.set(agentId,planId);warnings.delete(agentId);
  }
  return {assignments,warnings,warning:warnings.size ? `${warnings.size} medewerker(s): Work Plan-toewijzing niet vastgesteld. Zie de melding per medewerker.` : null};
}
export async function queryAgentWorkPlans(request: RequestFunction, managementUnitId: string, agentIds: string[], startDate: string): Promise<AssignmentResult> {
  const prefix = managementUnitPath(managementUnitId);
  if (!agentIds.length) return {assignments:new Map(),warnings:new Map(),warning:null};
  if (calendarDate(startDate) === null) throw Error('Ongeldige Work Plan-selectieweek.');
  const response = await request(`${prefix}/agents/workplans/query`, 'POST', {agentIds,startDate,weekCount: 1});
  return parseAgentWorkPlans(response,agentIds,startDate);
}

// Scope one cache to one MU and one refresh; cache in-flight requests as well.
export function createWorkPlanDetailsLoader(request: RequestFunction, managementUnitId: string) {
  const prefix = managementUnitPath(managementUnitId);
  const cache = new Map<string,Promise<Record<string,unknown>>>();
  return (id: string): Promise<Record<string,unknown>> => {
    if (!nonempty(id)) return Promise.reject(new Error('Work Plan-ID ontbreekt.'));
    let pending = cache.get(id);
    if (!pending) {
      pending = request(`${prefix}/workplans/${encodeURIComponent(id)}`).then(detail=>{
        if (!isRecord(detail) || detail.id !== id) throw Error('Work Plan-details ontbreken of horen bij een ander Work Plan-ID.');
        return detail;
      });
      cache.set(id,pending);
    }
    return pending;
  };
}
