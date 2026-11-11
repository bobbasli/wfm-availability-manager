export interface GenesysEntity { id: string; name?: string; [key: string]: unknown }
export interface ApiDiagnostic { status: number; method: string; path: string; response: unknown }
export interface WorkPlanAssignment { agentId: string; workPlanId: string }
export type GenesysApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
