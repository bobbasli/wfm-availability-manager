# Rooster- en beschikbaarheidshistorie

## Bronnen en betrouwbaar beschikbare gegevens

Onderzoek uitgevoerd op 26 november 2026 tegen de officiële Genesys SDK-modellen en gegenereerde endpointdocumentatie. Dit is een contractonderzoek, geen verificatie van een aangemelde tenant. De app hergebruikt uitsluitend de responses die zij al ophaalt. Een veld wordt alleen getoond als de bron klopt, het rooster/de medewerker overeenkomt en de timestamp geldig is.

| Betekenis | Gedocumenteerde bron | Gedrag |
|---|---|---|
| Aanmaakdatum rooster | `BuScheduleMetadata.metadata.dateCreated` via `WfmVersionedEntityMetadata` | Tonen indien aanwezig en geldig; nooit als publicatiedatum gebruiken. |
| Eerste publicatie | Geen veld in `BuScheduleMetadata` of `BuScheduleListItem` | **Niet beschikbaar**. `published` is een status, geen datum of bewijs van de eerste publicatie. |
| Laatste roosterbrede wijziging | `BuScheduleMetadata.metadata.dateModified` | Tonen indien aanwezig en geldig. Kan een andere medewerker betreffen. |
| Laatste wijziging geselecteerd agentrooster | `BuAgentScheduleQueryResponse.metadata.dateModified` | Alleen uit de unieke rij met `user.id` gelijk aan de geselecteerde medewerker. Geen terugval op globale/MU-metadata of andere medewerkers. |
| Aanmaakdatum Unavailable Time | Niet aanwezig in het gedocumenteerde `UnavailableTime` | **Niet beschikbaar**. `timeSpan.startDate` is de periode waarop onbeschikbaarheid geldt, geen aanmaakdatum. |
| Laatste wijziging Unavailable Time | Niet aanwezig in het gedocumenteerde `UnavailableTime` | **Niet beschikbaar**. Ook metadata van een listing of ander object mag dit niet vervangen. |
| Gewijzigd door — Unavailable Time | Niet aanwezig in het gedocumenteerde `UnavailableTime` | **Niet beschikbaar**. Medewerker/eigenaar van het blok is geen bewijs van de actor. |

`UnavailableTime` bevat `id`, `timeSpan` en `notes`; `UnavailableTimeListing` bevat `entities`. Ook `AgentScheduleUnavailableTime` bevat geen blokhistorie. Hoewel `WfmVersionedEntityMetadata.modifiedBy` bestaat voor roosters, kan die gebruiker niet aan een Unavailable Time worden toegeschreven. UserReference documenteert een ID/selfUri, geen betrouwbare blokactornaam.

De bestaande responseverwerking bewaart de ruwe rooster- en agentmetadata en `slot.original` voor blokken. De nieuwe historie-adapter gebruikt die gegevens rechtstreeks, zonder extra HTTP-verzoeken. Niet-gedocumenteerde blokvelden zoals een toevallig `metadata.dateCreated`, `createdAt` of `modifiedBy` worden bewust niet als bevestigd geaccepteerd. Als een tenant aanvullende velden teruggeeft, moet hun contract en objectscope eerst afzonderlijk worden bevestigd voordat ze worden ingeschakeld.

## Endpoints en rechten

Bestaande endpoints (ongewijzigd):
- `GET /api/v2/workforcemanagement/businessunits/{buId}/weeks/{weekId}/schedules/{scheduleId}` → `BuScheduleMetadata`.
- `POST /api/v2/workforcemanagement/businessunits/{buId}/weeks/{weekId}/schedules/{scheduleId}/agentschedules/query` → `BuAsyncAgentSchedulesQueryResponse.result.agentSchedules[]`.
- `POST /api/v2/workforcemanagement/agents/{agentId}/unavailabletimes/query` → `UnavailableTimeListing.entities[]`.

De eerste twee vereisen volgens de officiële endpointdocumentatie één van `wfm:schedule:view` of `wfm:publishedSchedule:view`. De derde vereist `wfm:unavailableTimes:view`. Alle aanroepen blijven in de bestaande centrale API-client. De wijziging voegt geen scopes, auditqueries of aanvullende gebruikerslookups toe.

De officiële route `GET .../schedules/{scheduleId}/history/agents/{agentId}` bestaat ook, met dezelfde roosterleesrechten. Het model bevat `basePublishedSchedule`, wijzigingen en expliciet `droppedChanges` wanneer de historie te groot wordt; een eerste gevonden historisch event is dus geen bewijs van volledige historie. Die geeft agentwijzigingshistorie, geen gedocumenteerde eerste roosterpublicatie of Unavailable Time-aanmaakdatum. Zij wordt nu niet extra aangeroepen: de bestaande agentquery heeft al eigen versioned metadata. Bij ontbrekende metadata wordt geen historische completeness of latest-event-aanname gemaakt.

## Audit Logs: onderzocht, niet automatisch opgevraagd

De officiële Audit API biedt:
- `GET /api/v2/audits/query/servicemapping` voor ondersteunde diensten/entiteiten/acties.
- `POST /api/v2/audits/query`, gevolgd door status en gepagineerde resultaten via `GET /api/v2/audits/query/{transactionId}` en `/results`.
- Realtime auditqueries, die volgens de documentatie slechts 14 dagen voor bepaalde diensten teruggeven; dit bewijst geen volledige historie.

Deze routes vereisen `audits:audit:view`. `AuditLogMessage` bevat onder meer `eventDate`, `action`, `entity`, `entityType`, `user`, `client` en `propertyChanges`. Dat zijn mogelijke bronnen voor een toekomstige historische adapter, maar zij bewijzen op zichzelf geen eerste publicatie of een gebeurtenis op het specifieke beschikbaarheidsblok. De ondersteunde WFM-acties en koppeling van schedule-/block-/agent-ID's moeten via service mapping en tenantvoorbeelden worden bevestigd. Een actor kan bovendien een systeem/client zijn.

Er is geen live service mapping of volledige audithistorie geverifieerd. Een beperkte zoekperiode of het eerste gevonden publish-event mag niet worden gepresenteerd als **de eerste** publicatie ooit. Retentie, pagination, herpublicatie, succesvolle actie, objectscope en volledigheid moeten eerst worden aangetoond. Daarom zijn er geen extra auditcalls en worden geen nieuwe rechten gevraagd.

## Datumweergave en vergelijking

Weergave is vast `dd-MM-yyyy HH:mm` in **Europe/Amsterdam**, via `Intl.DateTimeFormat.formatToParts` met een 24-uursklok. Tijdstempels moeten absolute ISO-8601-instanties zijn met `Z` of expliciete offset en maximaal millisecondenprecisie. Ongeldige kalenderdata, lokale tijden zonder offset, fijnere precisie en omgekeerde aanmaak-/wijzigingsvolgorde worden niet gegokt of afgerond tot een andere gebeurtenis. Ontbrekende/ongeldige waarden tonen **Niet beschikbaar**; er is geen fallback naar de huidige datum.

Vergelijkingen gebruiken de UTC-instanties, niet de geformatteerde tekst. Twee wintertijdinstellingen kunnen dezelfde lokale kloktijd tonen maar verschillende UTC-instanties zijn. De vergelijking behoudt dat onderscheid.

Het geteste vergelijkingsbeleid (`compareHistory`) accepteert uitsluitend betrouwbaar vastgestelde historische waarden:
- Blokaanmaak vóór / na / op hetzelfde tijdstip als eerste publicatie, alleen wanneer beide waarden beschikbaar zijn.
- Blokwijziging na de eigen agentroosterwijziging, wanneer die eigen datum bekend is.
- Anders hoogstens expliciet na de **roosterbrede** wijziging, met de melding dat een afzonderlijke medewerkersdatum ontbreekt. Die datum wordt nooit als agentdatum opgeslagen of gelabeld.

Omdat de bestaande responses geen betrouwbare eerste publicatie en geen blokhistorie leveren, toont het huidige API-pad **geen vóór-/na-statussen voor Unavailable Times**. Het beleid is met synthetische, als geverifieerd veronderstelde waarden getest, maar de ontbrekende API-bronnen blijven null. Een toekomstige adapter moet die bronbevestiging leveren voordat de statussen zichtbaar kunnen worden.

Een wijziging na publicatie zegt niet wie de wijziging heeft uitgevoerd en bewijst geen causaliteit of roosterconflict. De interface vermeldt dit expliciet en gebruikt neutrale bewoordingen.

## Implementatie en regressiegrenzen

- `src/domain/history.ts`: bronvalidatie, objectscope, vaste datumweergave en neutrale vergelijking.
- `src/components/ScheduleHistory.vue`: gescheiden datums boven de kalender.
- `src/components/AvailabilityHistory.vue`: alleen-lezen blokvelden en beperkingen in het bestaande bewerkvenster.
- De composable koppelt metadata aan het geladen rooster-ID én agent-ID. Nieuwe selectie en laden wissen/verbergen oude historie.
- Het bewerkvenster toont de historie als tekst, niet als invoer. PATCH-body's blijven beperkt tot de oorspronkelijke editorvelden; historie wordt nooit meegestuurd.
- Kalender, editor, OAuth PKCE en capaciteitstab blijven behouden. Het dialoog kan scrollen om de toegevoegde informatie bereikbaar te houden.

Tests dekken bronvelden, verkeerde en dubbele ID's, wijziging aan een andere medewerker, ontbrekende historie, geen fallback naar creatie/start/eigenaar/huidige datum, tijdzone/DST, vergelijking vóór/na publicatie en roosterwijziging, en het ontbreken van historievelden in editormutaties.

## Officiële bronnen

Go SDK commit onderzocht: `b6022b3b2cba93b670cec6ee571ecbd21f536f82`.
- https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/buschedulemetadata.go
- https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/wfmversionedentitymetadata.go
- https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/buagentschedulequeryresponse.go
- https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/unavailabletime.go
- https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/unavailabletimelisting.go
- https://github.com/MyPureCloud/platform-client-sdk-javascript/blob/12c531f528e6445b6d5947ce22ef27125d195835/build/docs/WorkforceManagementApi.md
- https://github.com/MyPureCloud/platform-client-sdk-javascript/blob/12c531f528e6445b6d5947ce22ef27125d195835/build/docs/AuditApi.md

## Aanvulling v0.3.1: gegevenssets bij roostergeneratie
De nieuwe Original-query maakt de bij roostergeneratie gebruikte onbeschikbaarheid vergelijkbaar met Latest Saved, ook bij een ongepubliceerde vergelijkingscontext. Dit corrigeert de eerdere te brede indruk dat zulke snapshots niet beschikbaar zouden zijn. De eerdere conclusie over ontbrekende **blokhistorietijdstempels** blijft juist: de nieuwe modellen bevatten alleen een considered-boolean, tijdvakken en notities. Een tijdvakverschil bewijst geen wijzigingsdatum, actor of eerste publicatie. Zie [AVAILABILITY_COMPARISON.md](AVAILABILITY_COMPARISON.md) voor de exacte body en bronnen.
