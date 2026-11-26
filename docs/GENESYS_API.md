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
| Agent Work Plan per week | `POST /api/v2/workforcemanagement/managementunits/{muId}/agents/workplans/query` | Weeklookupcontract door gebruiker opgegeven; parser en synthetische tests aanwezig |
| Activity Codes | `GET /api/v2/workforcemanagement/businessunits/{buId}/activitycodes` | Bestaande implementatie |
| Gepubliceerde agentroosters | `POST /api/v2/workforcemanagement/businessunits/{buId}/weeks/{weekId}/schedules/{scheduleId}/agentschedules/query` | Body o.a. `managementUnitId`, `userIds`, `teamIds`; bestaande implementatie |

## Work Plan-query en weeklookup
Request-body uit Genesys API Explorer:
```json
{"agentIds":["<agent UUID>"],"startDate":"2026-11-09","weekCount":1}
```
`startDate` is de start van de gekozen week (maandag). De MU-ID in de URL is verplicht. Het responsecontract is door de gebruiker opgegeven:

```json
{"result":{"referenceStartWeekDate":"2026-11-02","entities":[{"user":{"id":"synthetic-employee"},"workPlanLookupKeysPerWeek":[0,1]}],"workPlanLookup":{"0":{"id":"synthetic-plan-a"},"1":{"id":"synthetic-plan-b"}}}}
```

- Koppel uitsluitend `user.id`; negeer andere agentvelden en de volgorde van medewerkers.
- Weekindex = (geselecteerde kalenderdatum − `referenceStartWeekDate`) / 7 dagen, berekend met UTC-kalenderdatums zodat DST geen invloed heeft. Negatieve, niet-gehele en ontbrekende indices zijn ongeldig.
- De sleutel moet een niet-negatief geheel getal zijn; nul is geldig. `null`, strings, ontbrekende sleutels en onbekende tabelverwijzingen leveren geen assignment op.
- De tabel kan een numeriek geïndexeerd object of array zijn. De lookup-entry moet een expliciet `id` of `workPlanId` bevatten; bij beide moeten ze overeenkomen. Andere entryvormen blijven onbekend.
- Dubbele medewerkerrecords worden als ambigu afgewezen. Iedere ontbrekende/ongeldige toewijzing krijgt een melding per medewerker.
- Haal details rechtstreeks op via het gevonden ID, ook wanneer een plan ontbreekt in een Work Plan-lijst. Valideer dat de detailresponse hetzelfde ID bevat. Een cache per MU en refresh deelt ook gelijktijdige requests; een volgende refresh haalt opnieuw op zodat weekwijzigingen zichtbaar blijven.
- De serverquery bepaalt de weekgebonden toewijzing. Er is geen lokale aanname voor rotaties of overrides en geen terugval op een eerste/default plan. Afzonderlijke planversievelden zijn niet gespecificeerd in dit contract en worden niet verzonnen; live versie-/rotatiecontrole blijft een acceptatiepunt.

Work Plan details kunnen onder meer `weeklyExactPaidMinutes`, `weeklyMinimumPaidMinutes`, `weeklyMaximumPaidMinutes`, `flexibleWeeklyPaidTime`, `maximumDays`, `optionalDays.values`, `shifts`, `days.values`, starttijdgrenzen, betaald/onbetaald bevatten. Het `agents`-veld van de Work Plan-lijst kan leeg zijn: **niet** interpreteren als bewijs voor geen assignments.

## Capaciteitsmodel v0.2.1
De huidige en vorige geselecteerde week worden afzonderlijk met `weekCount: 1` opgevraagd. Dezelfde MU-/refreshgebonden detailcache wordt voor beide toewijzingen gebruikt. De vorige toewijzing is uitsluitend context om inkomende nachtdiensten te detecteren; zij vervangt nooit een ontbrekende huidige toewijzing.

Planbare ruimte komt uit de union van vensteruren minus de overlap met de union van Unavailable Times. Vorige-zondagvensters komen uit de vorige toewijzing; maandag–zondag uit de geselecteerde toewijzing. De ruimte wordt op Amsterdamse weekgrenzen afgeknipt. De marge wordt alleen lokaal toegepast en veroorzaakt geen API-call. Dit bewijst geen roosterhaalbaarheid en toetst geen volledige dienstcombinaties. Zie [CAPACITY_V021.md](CAPACITY_V021.md).

De centrale HTTP-module voert ook de OAuth-tokenuitwisseling uit. Alleen expliciet ondersteunde regiodomeinen zijn toegestaan; toegangstokens worden niet hergebruikt bij een andere regio of client. Paginering weigert onbekende responses en meldt de limiet van 50 pagina’s als fout. Rate limits blijven zichtbaar; mutaties worden nooit automatisch herhaald.

## Historietijdstempels
Roosters leveren `metadata.dateCreated` en `metadata.dateModified`; agentroosters leveren hun eigen `metadata.dateModified` in de via `user.id` geselecteerde rij. De bestaande roostermetadata heeft geen eerste publicatiedatum; `published` is alleen een boolean. `UnavailableTime` documenteert geen created/modified/actor-velden. Deze ontbrekende waarden krijgen geen fallback. Auditqueries vereisen `audits:audit:view`, maar worden niet automatisch aangeroepen zonder geverifieerde mapping en historievolledigheid. Zie [de volledige veldmatrix en officiële bronnen](HISTORY.md).

## v0.3.0 — technische herstructurering
De bestaande endpoints zijn ongewijzigd. `services/availability.ts` bevat nu de kalender-/rooster-/selectieaanroepen boven `genesysApi.ts`. Onbekende responses worden door helpers gevalideerd en omgezet naar getypeerde kalender-/editorstructuren. Er zijn geen auditcalls, nieuwe scopes of roostermutaties toegevoegd. De afzonderlijke Work Plan-service en de bestaande planningsruimteformule blijven behouden.

## Original versus Latest Saved v0.3.1
De aanvullende **POST /api/v2/workforcemanagement/businessunits/{businessUnitId}/unavailabletimes/schedules/query** gebruikt `{agentId, schedule:{id,weekDate}}`. `weekDate` is de startweek van het rooster (ook bij meerweekse roosters), niet noodzakelijk de geselecteerde kalenderweek. De response bevat `consideredInScheduleGeneration` en `scheduleGenerationUnavailableTimes[]` met `timeSpan` en `notes`. False betekent Niet gebruikt. Het endpoint vereist `wfm:unavailableTimes:view`. Er zijn geen blokhistorie- of publicatietijdstempels.

Roosterdiscovery gebruikt nu de geselecteerde maandag in **GET .../weeks/{weekId}/schedules?includeOnlyPublished=false**, niet recent. Deze route bevat volgens het officiële contract roosters die de geselecteerde week overspannen. De kalender blijft expliciet gepubliceerde roosters eisen; een aparte Original-selector mag ongepubliceerde context gebruiken. [Exacte modellen, bronnen, verwerking en live beperkingen](AVAILABILITY_COMPARISON.md).
