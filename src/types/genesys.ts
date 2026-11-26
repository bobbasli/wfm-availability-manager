export interface GenesysEntity {
  id: string;
  name?: string;
  [key: string]: unknown;
}
export interface ApiDiagnostic {
  status: number;
  method: string;
  path: string;
  response: unknown;
}
export interface WorkPlanAssignment {
  agentId: string;
  workPlanId: string;
}
export type GenesysApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
export interface GenesysApiConfig {
  region: () => string;
  token: () => string;
  onUnauthorized: () => void;
  onResponse: (diagnostic: ApiDiagnostic) => void;
}
export type RequestFunction = (
  path: string,
  method?: GenesysApiMethod,
  body?: unknown,
) => Promise<unknown>;

export interface AssignmentResult {
  assignments: Map<string, string>;
  warnings: Map<string, string>;
  warning: string | null;
}
