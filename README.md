# WFM Availability Manager v0.1.9

Vue 3 + Tailwind CSS prototype for Genesys Cloud (EU Central). Deploy `index.html` and `app.js` together on GitHub Pages.

## New
- Unified daily timeline: editable red Unavailable Times and read-only green published schedule segments.
- Schedule discovery via `GET /api/v2/workforcemanagement/businessunits/{businessUnitId}/weeks/recent/schedules`.
- Metadata via `GET /api/v2/workforcemanagement/businessunits/{businessUnitId}/weeks/{weekId}/schedules/{scheduleId}`.
- Agent schedule via `POST .../agentschedules/query` with `{managementUnitId,userIds:[agentId],teamIds:[]}`.
- Multiple published schedules require explicit selection. No schedule write endpoints are used.

## Important
The actual schedule response shape and week IDs have not been verified against a live Genesys environment. If the schedule list lacks a weekId or the response has an unexpected shape, the application shows a diagnostic instead of inventing a schedule. Work Plan integration is not yet implemented.

Test with a test user before use. OAuth configuration remains as in v0.1.8.
