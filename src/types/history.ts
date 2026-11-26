export interface EntityHistory {
  createdAt: string | null;
  modifiedAt: string | null;
}
export interface ScheduleHistory extends EntityHistory {
  firstPublishedAt: string | null;
  agentModifiedAt: string | null;
}
export interface AvailabilityHistory extends EntityHistory {
  modifiedBy: string | null;
}
