# Genesys Cloud API-contract en aannames

Regio EUC1: `https://api.mypurecloud.de`. Login: `https://login.mypurecloud.de`. Alle calls via `src/services/genesysApi.ts`. Meerdere regio's configureerbaar.

| Doel | Endpoint | Status |
|---|---|---|
| Ingelogde gebruiker | `GET /api/v2/users/me` | Bestaande implementatie |
| Business Units | `GET /api/v2/workforcemanagement/businessunits` | Bestaande implementatie |
| Management Units | `GET /api/v2/workforcemanagement/businessunits/{buId}/managementunits` | Bestaande implementatie |
| Agenten in MU | `GET /api/v2/workforcemanagement/managementunits/{muId}/users` | Bestaande implementatie |
| Gebruikersnaam indien nodig | `GET /api/v2/users/{userId}` | Bestaande implementatie |
| Unavailable Times ophalen | `POST /api/v2/workforcemanagement/agents/{agentId}/unavailabletimes/query` met `{startDate,endDate}` | Bestaande implementatie |
| Unavailable Times wijzigen | `PATCH /api/v2/workforcemanagement/agents/{agentId}/unavailabletimes` | Bestaande implementatie; bevestiging vereist |
| Work Plans | `GET /api/v2/workforcemanagement/managementunits/{muId}/workplans` | Bestaande implementatie |
| Work Plan detail | `GET /api/v2/workforcemanagement/managementunits/{muId}/workplans/{workPlanId}` | Bestaande implementatie |
| Agent Work Plan per week | `POST /api/v2/workforcemanagement/managementunits/{muId}/agents/workplans/query` | Request-body door gebruiker bevestigd, **response-vorm niet gevalideerd** |
| Activity Codes | `GET /api/v2/workforcemanagement/businessunits/{buId}/activitycodes` | Bestaande implementatie |
| Gepubliceerde agentroosters | `POST /api/v2/workforcemanagement/businessunits/{buId}/weeks/{weekId}/schedules/{scheduleId}/agentschedules/query` | Body o.a. `managementUnitId`, `userIds`, `teamIds`; bestaande implementatie |

## Openstaand: Work Plan-query
Request-body uit Genesys API Explorer:
```json
{"agentIds":["<agent UUID>"],"startDate":"2026-11-09","weekCount":1}
```
`startDate` start van gekozen week (maandag). De response moet nog worden getest met twee agenten met **verschillende** Work Plans. Geen echte UUID's in git. Bouw pas een betrouwbare parser na validatie van het concrete response-schema. Tijdelijke overrides en rotaties moeten afzonderlijk worden behandeld en getest.

Work Plan details kunnen onder meer `weeklyExactPaidMinutes`, `weeklyMinimumPaidMinutes`, `weeklyMaximumPaidMinutes`, `flexibleWeeklyPaidTime`, `maximumDays`, `optionalDays.values`, `shifts`, `days.values`, starttijdgrenzen, betaald/onbetaald bevatten. Het `agents`-veld van de Work Plan-lijst kan leeg zijn: **niet** interpreteren als bewijs voor geen assignments.

## Capaciteitsmodel (concept)
Zichtbaar: bruto mogelijke inzetvensters, Unavailable Time-overlap, netto vensters, betaalde uren (exact/range), flexmarge (standaard 25%), indicatieve normdekking. Shiftvensters vormen een **envelop** die onmogelijke combinaties kan omvatten; geen hard roosteradvies. Houd rekening met lokale tijd Europe/Amsterdam en grensgevallen rond DST en nachtdiensten.
