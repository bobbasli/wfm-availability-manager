export type Interval = [number, number];
export interface PlanningSpace {
  paid: { min: number; max: number } | null;
  windowHours: number | null;
  blockedHours: number | null;
  spaceHours: number | null;
  reason: string | null;
}
export type SpaceStatus = 'green' | 'orange' | 'red' | 'unknown';
export interface SpaceBoundary {
  paidHours: number;
  requiredHours: number | null;
  percentage: number | null;
  status: SpaceStatus;
  description: string;
}
export interface SpaceAssessment {
  minimum: SpaceBoundary | null;
  maximum: SpaceBoundary | null;
  reason: string | null;
}

export interface CapacityRow {
  id: string;
  name: string;
  planName: string;
  space: PlanningSpace;
}
