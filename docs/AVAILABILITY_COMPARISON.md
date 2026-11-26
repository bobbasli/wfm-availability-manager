# Gedeelde weeknavigatie en Original / Latest Saved — v0.3.1

## Gedrag

Capaciteit & beschikbaarheid is standaard actief. De vijf capaciteitkolommen, kleuren, marge en permanente toelichting zijn ongewijzigd. Medewerkersnamen zijn toetsenbordbedienbare, onderstreepte knoppen; zij sturen uitsluitend de Genesys User-ID door, niet de naam. BU en MU blijven behouden.

`useWeekSelection` beheert één maandagweek voor beide tabs. Datumselectie wordt genormaliseerd naar maandag; vorige/volgende week verplaatst zeven kalenderdagen. De kalender toont maandag t/m zondag. Kalender-/jaar-/maandgrenzen worden met UTC-kalenderdagen berekend; daadwerkelijke querygrenzen zijn lokale Amsterdamse middernachten, dus DST-veilig. ISO-weeknummers worden niet gebruikt als rekensleutel.

Een doorklik toont de gekozen medewerker/week en laadt Latest Saved en de weekroosters onafhankelijk. Een ontbrekend of mislukt rooster verhindert niet dat onbeschikbaarheid zichtbaar blijft. De melding bij geen gepubliceerd rooster is: ‘Voor deze medewerker en week is geen gepubliceerd rooster beschikbaar.’ Meerdere gepubliceerde roosters vragen een expliciete keuze; er wordt geen willekeurig rooster aan een medewerker toegewezen.

## Bevestigd officieel querycontract

```http
POST /api/v2/workforcemanagement/businessunits/{businessUnitId}/unavailabletimes/schedules/query
```

```json
{
  "agentId": "<geselecteerde Genesys User-ID>",
  "schedule": {
    "id": "<rooster-ID>",
    "weekDate": "<eerste week van dit rooster, yyyy-MM-dd>"
  }
}
```

`QueryAgentScheduleUnavailableTimesRequest` bevat `agentId` en `schedule` (`BuScheduleReference`). Die referentie bevat `id`, `weekDate` en een optionele `selfUri`; de app stuurt uitsluitend de eerste twee. De BU-ID hoort in de URL. Geen verzonnen `agentIds`, `startDate`, `endDate`, MU-ID of queryweek in de body.

De **startweek van het gekozen rooster** kan afwijken van de geselecteerde kalenderweek bij een meerweeks rooster. Daarom komt `schedule.weekDate` uit het echte schedule-object of zijn canonieke selfUri, niet uit de huidige week. De responseperioden worden pas lokaal afgeknipt op de geselecteerde week.

Gedocumenteerde response:

```json
{
  "consideredInScheduleGeneration": false,
  "scheduleGenerationUnavailableTimes": []
}
```

Bij `false`: **Niet gebruikt (Not Used)**, ongeacht een lege lijst. Dat bewijst geen oorspronkelijke volledige beschikbaarheid. De SDK beschrijft ook false als er geen rooster bestaat. Bij `true` en een geldige expliciete lege lijst: geen onbeschikbare perioden gebruikt. Bij ontbrekende boolean/lijst of ongeldige perioden: onbekend, zonder vergelijking te verzinnen.

`AgentScheduleUnavailableTime` bevat `timeSpan` (`startDate`, `lengthMinutes`) en `notes`; geen blok-ID of blokhistorie. `Latest Saved` gebruikt de bestaande `POST /agents/{agentId}/unavailabletimes/query` met de Amsterdamse weekgrenzen en `UnavailableTimeListing.entities[]`.

Beide unavailable-query's vereisen **wfm:unavailableTimes:view**. De weekroosterlisting en metadata/agentquery vereisen volgens de officiële endpointdocumentatie één van **wfm:schedule:view** of **wfm:publishedSchedule:view**. De app verleent geen rechten; ontbrekende rechten worden zichtbaar gemeld. Er zijn geen auditcalls of nieuwe scopes toegevoegd.

## Gepubliceerde versus ongepubliceerde context

De app vraagt `GET .../businessunits/{buId}/weeks/{geselecteerdeMaandag}/schedules?includeOnlyPublished=false`. Volgens Genesys bevat die listing de roosters die de gekozen week overspannen. De brede `recent`-alias wordt niet meer gebruikt: daardoor kan een doorklik niet ongemerkt een rooster uit een andere week selecteren.

De kalenderselectie filtert uitsluitend expliciet gepubliceerde roosters en bevestigt die status opnieuw via metadata. Alleen die roosters mogen groene diensten/activiteiten tonen. Een afzonderlijke selector voor **Original-vergelijking** accepteert ook ongepubliceerde roosters die de API voor deze week en rechten teruggeeft. Die keuze genereert of wijzigt geen rooster en toont geen ongepubliceerde diensten in de kalender. Een vergelijking is dus geen bewijs van publicatie.

## Vergelijkingsmethode

De nieuwe pure helper valideert absolute tijdstippen, verenigt overlappende/aansluitende intervallen en knipt beide datasets per Amsterdamse kalenderdag. Middernacht wordt als 24:00 aan het einde van een dag getoond. Weekgrensperioden tellen uitsluitend binnen de geselecteerde week. Vergelijking gebruikt UTC-instanties; lokale klokweergave is geen rekensleutel.

De tabel toont **Original**, **Latest Saved** en **Gelijk / Gewijzigd / Niet te vergelijken**. De vergelijking betreft samengevoegde tijdvakken, geen notities of blok-ID's. ‘Beschikbaar’ betekent alleen dat een geldige betreffende dataset geen onbeschikbare perioden in die dag heeft. Onbekende data worden als ‘Gegevens niet beschikbaar’ getoond; bij false staat expliciet ‘Niet gebruikt’.

## Laden, wijzigingen en terugkeer

Selectie-/sessieversies en aparte requestversies negeren late responses, inclusief Original. Kalenderwijzigingen binnen één tick worden gebundeld. Identieke lopende availability-, roosterlisting- en agentroosterverzoeken delen een promise. Original wordt één keer bij een echte vergelijkingskeuzewijziging opgehaald. Bij dezelfde al geladen medewerker/week wordt de kalender hergebruikt.

Terug naar capaciteit haalt niets op zolang de bestaande gegevens actueel zijn. Alleen na een succesvolle bevestigde PATCH wordt de capaciteit ongeldig gemaakt, ook wanneer de daaropvolgende calendar-refresh faalt. Een annulering of mislukte PATCH doet dat niet. Bij terugkeer wordt het geselecteerde MU/weekoverzicht één keer opnieuw opgehaald (huidige/vorige Work Plans plus availability), met de bestaande caches per refresh. Een oude lopende berekening mag na zo'n wijziging geen verouderde rijen terugplaatsen. De marge blijft behouden.

## Betrouwbare datums en beperkingen

- Rooster: `metadata.dateCreated` en `metadata.dateModified`, indien geldig. Agentrooster: uitsluitend eigen `metadata.dateModified`. Weergave Europe/Amsterdam; deze blijven onderscheiden.
- Eerste roosterpublicatie: **niet beschikbaar** in de onderzochte metadata, ook niet in deze nieuwe Original-response. Creatie is geen vervanging.
- Aanmaak/wijziging/actor van een Niet beschikbaar-blok: **niet beschikbaar** in `UnavailableTime` en `AgentScheduleUnavailableTime`.
- `timeSpan.startDate` is de begintijd van onbeschikbaarheid, geen registratietijdstip.
- Original versus Latest Saved toont een verschil tussen twee gegevenssets, geen tijdlijn van tussentijdse wijzigingen, actor of oorzaak van een conflict.
- Geen live aangemelde tenantquery uitgevoerd: contractonderzoek en tests gebruiken de officiële SDK-documentatie en synthetische fixtures. Rechten, werkelijke meerweekse roosters en tenantresponses moeten nog live worden geaccepteerd.

## Officiële bronnen, geraadpleegd 26 november 2026

Go SDK commit `b6022b3b2cba93b670cec6ee571ecbd21f536f82`, map `platformclientv2`:
- [QueryAgentScheduleUnavailableTimesRequest](https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/queryagentscheduleunavailabletimesrequest.go)
- [BuScheduleReference](https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/buschedulereference.go)
- [QueryAgentScheduleUnavailableTimesResponse](https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/queryagentscheduleunavailabletimesresponse.go)
- [AgentScheduleUnavailableTime](https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/agentscheduleunavailabletime.go)
- [WfmTimeSpan](https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/wfmtimespan.go)
- [WorkforceManagementApi](https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/workforcemanagementapi.go)

JavaScript SDK commit `12c531f528e6445b6d5947ce22ef27125d195835`:
- [Endpointdocumentatie en rechten](https://github.com/MyPureCloud/platform-client-sdk-javascript/blob/12c531f528e6445b6d5947ce22ef27125d195835/build/docs/WorkforceManagementApi.md#postWorkforcemanagementBusinessunitUnavailabletimesSchedulesQuery)

Zie ook [HISTORY.md](HISTORY.md) voor de veldmatrix van historie en auditbeperkingen.
