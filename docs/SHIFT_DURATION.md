# Controle totale dienstduur en planbare ruimte

## Onderzoek en afbakening

De melding ‘40 uur, geen weekend toont 47,5 uur in plaats van 50 uur’ is een hypothese over de tenantdata. De daadwerkelijke Work Plan-detailresponse is voor deze wijziging nog niet beschikbaar. Er is geen live Genesys-sessie gebruikt; de naam van het plan is niet gebruikt als bron voor vaste uren of pauzes. Het werkelijke plan wordt dus niet zonder bewijs tot 50 uur gecorrigeerd.

De eerdere code telde **expliciet onbetaalde** activiteiten al op. Daarmee staat niet vast dat in het gemelde geval een aanwezige pauze werd vergeten. Wel is een concrete foutbron vastgesteld: ontbrekende `activities` werd geïnterpreteerd als `[]`, dus als nul onbetaalde minuten. Daardoor kon een te laag maar schijnbaar geldig resultaat ontstaan. Deze aanname is verwijderd. Ontbrekende of onduidelijke gegevens leveren nu een melding zonder percentage op.

Voor de exacte oorzaak in de tenant zijn de echte `shifts` nodig, met modevlaggen, starttijdgrenzen, betaalde dienstduur en activiteiten. Er worden geen headers, tokens of persoonsgegevens gevraagd of opgeslagen in fixtures. De geanonimiseerde detailresponse kan tegen de nieuwe diagnose worden gecontroleerd.

## Betekenis van de velden

De officiële Genesys SDK-modellen documenteren:
- `exactPaidTimeMinutes`: betaalde minuten voor de gehele dienst bij `flexiblePaidTime=false`.
- `minimumPaidTimeMinutes` en `maximumPaidTimeMinutes`: minimum en maximum voor de gehele betaalde dienstduur bij `flexiblePaidTime=true`.
- `WorkPlanActivity.countsAsPaidTime`: geeft aan of een activiteit betaald is.
- `WorkPlanActivity.lengthMinutes`: duur van die activiteit.

Betaalde activiteiten zijn al inbegrepen in de betaalde dienstminuten. Ze worden **niet opnieuw toegevoegd**. Alleen activiteiten met de expliciete boolean `countsAsPaidTime=false` worden met hun eigen geldige `lengthMinutes` opgeteld. Er is geen standaardpauze, geen limiet van één pauze en geen vaste toeslag van 30 minuten.

Bronnen, geraadpleegd op 26 november 2026:
- https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/workplanshift.go
- https://github.com/MyPureCloud/platform-client-sdk-go/blob/b6022b3b2cba93b670cec6ee571ecbd21f536f82/platformclientv2/workplanactivity.go

Deze contractcontrole is geen verificatie van de daadwerkelijke tenantresponse.

## Berekening en validatie

`totalShiftDuration` in `src/domain/shiftDuration.ts` valideert de dienst en retourneert:

`totalMinutes = paidMinutes + unpaidMinutes`

Bij flexibele betaalde duur wordt voor de buitenenvelop het maximum gebruikt; minimum en maximum moeten expliciet geldig en geordend zijn. Bij vaste duur wordt uitsluitend exact gebruikt, ook als ongebruikte rangevelden nog aanwezig zijn. Een ontbrekende modevlag is alleen ondubbelzinnig wanneer er uitsluitend een exact veld en geen concurrerende rangevelden staan. Anders volgt een melding met het ontbrekende veld. Lege of ontbrekende waarden worden niet numeriek naar nul geconverteerd.

`activities: []` bevestigt expliciet dat er geen activiteittoeslag is. Een ontbrekende lijst, ontbrekende `countsAsPaidTime`, of ontbrekende/ongeldige duur van een onbetaalde activiteit geeft een gerichte foutmelding. De duur van een betaalde activiteit wordt niet nodig geacht voor de toeslag: de totale betaalde dienstminuten komen al uit het betaald-dienstveld. Zo wordt ook geen nulduur voor een betaalde activiteit verzonnen.

Per toegestane startdag geldt:
- begin = vroegste lokale start;
- einde = laatste lokale start + totale verstreken dienstduur;
- bij vaste start zijn vroegste en laatste gelijk.

Amsterdamse kloktijden worden naar UTC omgezet vóór de verstreken duur wordt toegevoegd. De dienstvensters worden op de geselecteerde week afgeknipt. De vorige zondag gebruikt het Work Plan van de vorige week, nooit een toevallige fallback. Diensten langer dan 24 uur blijven onbekend omdat dan extra vorige-dagcontext nodig is.

Overlappende vensters worden verenigd voordat uren worden geteld. Unavailable Times worden afzonderlijk verenigd; alleen hun overlap met de vensters wordt afgetrokken. Pauzes worden niet in de Unavailable Times-lijst geplaatst. Marges, kleuren en percentages volgen ongewijzigd `CAPACITY_V021.md` en reageren nog steeds zonder nieuwe API-calls.

## Controleerbare uitsplitsing

De vijf tabelkolommen en de permanente toelichting blijven behouden. Daaronder staat de uitklapbare **Berekening inzetvensters per medewerker**:
- per dienst de vroegste/laatste start, betaalde exacte/maximale duur, totale onbetaalde minuten, totale duur en het einde van de volledige envelop;
- per kalenderdag de samengevoegde vensters, uren venster, echte onbeschikbaarheid en resterende ruimte;
- bron ‘vorige week’ of ‘geselecteerde week’ zodat grensdiensten te herkennen zijn.

De volledige dienstdefinities zijn vóór weekafkapping weergegeven; de dagtotalen zijn afgeknipt, gesplitst op Amsterdamse middernacht en al samengevoegd. Overlappende ruwe definities mogen dus niet nogmaals worden opgeteld. Bij ontbrekende gegevens staat de veldmelding in plaats van een verzonnen uitsplitsing. Deze diagnose gebruikt uitsluitend dezelfde al opgehaalde data en voegt geen API-calls toe.

## Referentievoorbeeld — niet de geverifieerde tenantdefinitie

Met vijf dagen, 480 betaalde minuten, één onbetaalde activiteit van 30 minuten en starttijden 09:00–10:30 bedraagt de totale dienstduur 510 minuten. De envelop is 09:00–19:00: 90 minuten startvrijheid + 510 minuten dienstduur = 600 minuten per dag.

| Dag in synthetische testweek | Vroegste start | Laatste start | Einde envelop | Vensteruren |
|---|---|---|---|---|
| Maandag 09-11-2026 | 09:00 | 10:30 | 19:00 | 10 |
| Dinsdag 10-11-2026 | 09:00 | 10:30 | 19:00 | 10 |
| Woensdag 11-11-2026 | 09:00 | 10:30 | 19:00 | 10 |
| Donderdag 12-11-2026 | 09:00 | 10:30 | 19:00 | 10 |
| Vrijdag 13-11-2026 | 09:00 | 10:30 | 19:00 | 10 |

Bij nul onbeschikbaarheid is dat 50 uur ruimte. Met 40 betaalde weekuren en 25% marge is de indicator `50/(40*1,25)*100 = 100%`.

Bij dezelfde dienst maar starttijden **09:00–10:00** is de envelop 09:00–18:30, oftewel 9,5 uur per dag en **47,5 uur** per week. Dat is een geldige uitkomst en wordt niet geforceerd naar 50 uur.

Bij **ontbrekende activiteitengegevens** en starttijden 09:00–10:30 gaf de eerdere code eveneens 47,5 uur (480 minuten + 90 minuten, zonder bewezen pauzeduur). De nieuwe code geeft in die situatie onbekend, totdat de activiteitgegevens zijn bevestigd. Dit reproduceert een mogelijke foutbron, maar bevestigt nog niet de oorzaak in de gemelde tenant.

## Tests

Regressietests dekken 8 uur betaald + 30 minuten onbetaald; meerdere onbetaalde activiteiten (30 + 15); betaalde activiteiten niet dubbel tellen; expliciet geen activiteiten; vaste/flexibele starts; exacte/maximale betaalde duur; ambigue of ontbrekende velden; overlappende vensters en Unavailable Times; nacht- en weekgrensdiensten; dagtotalen; 50 uur/100% bij de beschreven referentie en 47,5 uur bij werkelijk smallere vensters. De bestaande marge-, editor-, historie- en OAuth-tests blijven actief.
