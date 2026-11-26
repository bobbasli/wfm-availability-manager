import type { Ref } from 'vue';
import type { GenesysEntity } from './genesys';

export type ActiveTab = 'calendar' | 'capacity';
export type SelectionSnapshot = () => () => boolean;
export type StatusReporter = (message: string, isError?: boolean) => void;
export interface SelectionContext {
  businessUnit: Ref<string>;
  managementUnit: Ref<string>;
  agentId: Ref<string>;
  token: Ref<string>;
  snapshot: SelectionSnapshot;
}
export interface UnavailableBlock {
  id?: string;
  timeSpan: { startDate: string; lengthMinutes: number };
  notes?: string;
}
export interface TimelineInterval {
  date: string;
  from: number;
  to: number;
  label: string;
  original: UnavailableBlock;
}
export interface CalendarDay {
  date: string;
  label: string;
  intervals: TimelineInterval[];
}
export interface ScheduleSegment {
  date: string;
  from: number;
  to: number;
  label: string;
  color: string | null;
  kind: 'shift' | 'activity';
}
export interface ScheduleDay extends CalendarDay {
  shifts: ScheduleSegment[];
  activities: ScheduleSegment[];
}
export interface ScheduleCandidate {
  id: string;
  weekId: string | null;
  name?: string;
  raw: Record<string, unknown>;
}
export interface ScheduleDiagnostic {
  scheduleId: string;
  agentId: string;
  schedule: Record<string, unknown>;
  resolvedWeekId: string;
  metadata: unknown;
  response?: unknown;
}
export interface AvailabilityDraft {
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
  notes: string;
}
export interface EditorContext {
  agentId: Ref<string>;
  token: Ref<string>;
  start: Ref<string>;
  busy: Ref<boolean>;
  agents: Ref<GenesysEntity[]>;
  snapshot: SelectionSnapshot;
  report: StatusReporter;
  refresh: () => Promise<boolean | undefined>;
}
