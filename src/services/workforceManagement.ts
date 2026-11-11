import type { RequestFunction } from './genesysApi';
interface AssignmentResult { assignments: Map<string, string>; warning: string | null }

export async function queryAgentWorkPlans(request: RequestFunction, managementUnitId: string, agentIds: string[], startDate: string): Promise<AssignmentResult> {
  if (!agentIds.length) return { assignments: new Map(), warning: null };
  // The production response contract has not been verified. Recognizable IDs do
  // not establish an effective week, rotation, override or historical plan version.
  // Keep querying for diagnostics, but fail closed until verified fixtures exist.
  await request(`/api/v2/workforcemanagement/managementunits/${encodeURIComponent(managementUnitId)}/agents/workplans/query`, 'POST', { agentIds, startDate, weekCount: 1 });
  return {
    assignments: new Map(),
    warning: 'Niet vastgesteld: het weekgebonden Work Plan-responsecontract, rotaties, overrides en planversies zijn nog niet geverifieerd. Er worden geen capaciteitspercentages berekend.',
  };
}
