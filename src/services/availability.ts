import type { RequestFunction } from './genesysApi';
import type { GenesysEntity } from '../types/genesys';

const encode = encodeURIComponent;
const wfm = '/api/v2/workforcemanagement';
export function createAvailabilityService(
  request: RequestFunction,
  pages: (path: string) => Promise<GenesysEntity[]>,
) {
  const schedulePath = (bu: string, week: string, id: string) =>
    `${wfm}/businessunits/${encode(bu)}/weeks/${encode(week)}/schedules/${encode(id)}`;
  return {
    currentUser: () => request('/api/v2/users/me'),
    businessUnits: () => pages(`${wfm}/businessunits`),
    managementUnits: (bu: string) => pages(`${wfm}/businessunits/${encode(bu)}/managementunits`),
    agents: (mu: string) => pages(`${wfm}/managementunits/${encode(mu)}/users`),
    user: (id: string) => request(`/api/v2/users/${encode(id)}`),
    unavailable: (id: string, range: { startDate: string; endDate: string }) =>
      request(`${wfm}/agents/${encode(id)}/unavailabletimes/query`, 'POST', range),
    updateUnavailable: (id: string, body: unknown) =>
      request(`${wfm}/agents/${encode(id)}/unavailabletimes`, 'PATCH', body),
    activityCodes: (bu: string) => request(`${wfm}/businessunits/${encode(bu)}/activitycodes`),
    schedules: (bu: string) => request(`${wfm}/businessunits/${encode(bu)}/weeks/recent/schedules`),
    schedule: (bu: string, week: string, id: string) => request(schedulePath(bu, week, id)),
    agentSchedule: (bu: string, week: string, id: string, mu: string, agent: string) =>
      request(`${schedulePath(bu, week, id)}/agentschedules/query`, 'POST', {
        managementUnitId: mu,
        userIds: [agent],
        teamIds: [],
      }),
  };
}
export type AvailabilityService = ReturnType<typeof createAvailabilityService>;
