WFM Availability Manager v0.1.9.4

Fix: parse completed Genesys schedule query responses from result.agentSchedules, match the selected user by user.id, render shifts as read-only green segments in the existing timeline. Clearer messages when no matching shifts are in the visible date range. Existing unavailable-times editing and Tailwind header unchanged.

WFM Availability Manager v0.1.9.3

Fix: robust Week-ID resolution from Genesys weekDate or canonical selfUri, including nested raw objects; metadata/query use resolved value. Cache-busted app.js URL. Read-only schedule unchanged; unavailable times editor unchanged.

# WFM Availability Manager v0.1.9.2

Vue 3 + Tailwind CSS prototype for Genesys Cloud (EU Central). Deploy `index.html` and `app.js` together on GitHub Pages.

## New
- Unified daily timeline: editable red Unavailable Times and read-only green published schedule segments.
- Schedule discovery via `GET /api/v2/workforcemanagement/businessunits/{businessUnitId}/weeks/recent/schedules`.
- Metadata via `GET /api/v2/workforcemanagement/businessunits/{businessUnitId}/weeks/{weekId}/schedules/{scheduleId}`.
- Agent schedule via `POST .../agentschedules/query` with `{managementUnitId,userIds:[agentId],teamIds:[]}`.
- Multiple published schedules require explicit selection. No schedule write endpoints are used.

## Important
The actual schedule response shape and week IDs have not been verified against a live Genesys environment. The schedule week path uses the explicit `weekDate` returned by Genesys when `weekId` is absent. If the response has an unexpected shape, the application shows a diagnostic. Work Plan integration is not yet implemented.

Test with a test user before use. OAuth configuration remains as in v0.1.8.

## v0.1.9.2
- Genesys Cloud-inspired header gradient using Tailwind utility classes (#3d538f → #263b73 → #152550).
- Header button styling and keyboard focus color #5476d5.
- No changes to schedule API or availability editing logic.
