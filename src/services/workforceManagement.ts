import type { RequestFunction } from './genesysApi';
import type { WorkPlanAssignment } from '../types/genesys';
interface AssignmentResult { assignments: Map<string, string>; warning: string | null }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const idOf = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (isRecord(value) && typeof value.id === 'string') return value.id;
  return null;
};
const extractAssignments = (payload: unknown, knownAgentIds: Set<string>): WorkPlanAssignment[] => {
  if (Array.isArray(payload)) return payload.flatMap(item => extractAssignments(item, knownAgentIds));
  if (!isRecord(payload)) return [];
  const agentId = idOf(payload.agentId) ?? idOf(payload.userId) ?? idOf(payload.agent) ?? idOf(payload.user);
  const workPlanId = idOf(payload.workPlanId) ?? idOf(payload.workPlan) ?? idOf(payload.workPlanConfigurationId) ?? idOf(payload.workPlanConfiguration);
  if (agentId && knownAgentIds.has(agentId) && workPlanId) return [{ agentId, workPlanId }];
  const collectionKeys = ['result', 'results', 'entities', 'items', 'agents', 'agentWorkPlans', 'workPlans', 'weeks', 'assignments'];
  const nested = collectionKeys.flatMap(key => key in payload ? extractAssignments(payload[key], knownAgentIds) : []);
  // Support maps keyed by agent ID without guessing an unrelated Work Plan.
  for (const [key, value] of Object.entries(payload)) {
    if (!knownAgentIds.has(key)) continue;
    const plan = isRecord(value) ? idOf(value.workPlanId) ?? idOf(value.workPlan) : null;
    if (plan) nested.push({ agentId: key, workPlanId: plan });
  }
  return nested;
};
export async function queryAgentWorkPlans(request: RequestFunction, managementUnitId: string, agentIds: string[], startDate: string): Promise<AssignmentResult> {
  if (!agentIds.length) return { assignments: new Map(), warning: null };
  const response: unknown = await request(`/api/v2/workforcemanagement/managementunits/${encodeURIComponent(managementUnitId)}/agents/workplans/query`, 'POST', { agentIds, startDate, weekCount: 1 });
  const matches = extractAssignments(response, new Set(agentIds));
  const grouped = new Map<string, Set<string>>();
  for (const item of matches) grouped.set(item.agentId, (grouped.get(item.agentId) ?? new Set()).add(item.workPlanId));
  const assignments = new Map<string, string>();
  for (const [agentId, plans] of grouped) if (plans.size === 1) assignments.set(agentId, [...plans][0]);
  const warning = assignments.size === 0 ? 'Work Plan-query gaf geen herkenbare toewijzingen terug; geen percentages berekend. Controleer de response-structuur.' : null;
  return { assignments, warning };
}
