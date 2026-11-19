# Capaciteit & beschikbaarheid v0.2.1

## Twee afzonderlijke vragen

**Planbaarheid** telt betaalde uren in een combinatie van volledige geldige diensten. Een grote inzetenvelop betekent geen extra contractcapaciteit. Dekking = `min(100, maximaal planbare betaalde uren / vereist minimum × 100)`. Bij exacte weekuren zijn minimum en maximum gelijk. Bij flexibele weekuren wordt het minimum als eis en het maximum als harde bovengrens gebruikt. Bij nul vereiste uren tonen we geen percentage (delen door nul); het uurmaximum blijft zichtbaar.

**Flexibiliteit** beschrijft keuzeruimte binnen de berekende regels. Geen opslag van 25% en geen ratio van vrije vensteruren ten opzichte van contracturen. De oude marge wordt niet ingelezen; opgeslagen browserwaarden veranderen de uitkomst niet.

## Data en versiegrenzen

De bestaande MU-weekquery koppelt uitsluitend `user.id` en de weeksleutel via `referenceStartWeekDate` en `workPlanLookup`. Zowel de geselecteerde als de vorige week wordt opgevraagd. De vorige toewijzing is alleen grenscontext, nooit een fallback voor de geselecteerde week. Details worden per MU, plan-ID en refresh gedeeld, inclusief lopende verzoeken. Zonder betrouwbare assignment of details is de status **Niet vast te stellen**.

Waarom de vorige week? Een vorige Work Plan kan een zondagse nachtdienst bevatten die maandag nog doorloopt. Zonder die context zouden planwijzigingen ten onrechte een vrije maandag kunnen suggereren. Als de vorige context ontbreekt of een mogelijke dienst daadwerkelijk inloopt, wordt geen definitieve weekberekening getoond. Uitgaande diensten na zondag worden ook niet willekeurig afgeknipt of volledig als deze week geboekt: de status wordt onbekend. Dit vereist later een expliciet weekoverstijgend model met aangrenzende dienstindelingen en regels voor betaalde-urentelling.

## Exacte berekening binnen de ondersteunde regels

`src/domain/plannability.ts` is een pure, strikt getypeerde module. Er zijn geen API-calls in de solver. `src/composables/useCapacity.ts` haalt de data via de centrale client op, valideert Unavailable Times en bewaakt selectiewisselingen.

1. Valideer weekuren, maximum werkdagen, optionele/verplichte dagen, dienstregels en activiteitgegevens. Niet herkende inhoudelijke velden worden geweigerd; er wordt geen regel verzonnen of weggegooid om toch een percentage te tonen.
2. Genereer per lokale startdatum alle toegestane starts, met de expliciete `startIncrementMinutes` bij flexibele starttijden. Genereer alle gehele betaalde minuten tussen minimum en maximum, met betaalde-tijdgranulariteit wanneer ingesteld. Een vaste dienst heeft exact één betaalde duur.
3. Plaats vaste activiteiten op hun expliciete tijd, relatief aan dienststart of lokale middernacht. Onbetaalde activiteitminuten verlengen de totale dienst maar verhogen het betaalde aantal minuten niet. Activiteiten moeten volledig in de dienst passen en elkaar niet overlappen. Een onbeschikbare periode blokkeert de volledige dienst, inclusief pauzes: de medewerker hoeft tijdens onbeschikbaarheid ook niet in een onbetaalde pauze van een geplande dienst te blijven.
4. Splits of verkort geen vaste dienst bij overlap. Voeg overlappende Unavailable Times samen en verwijder iedere kandidaatdienst die een periode overlapt. De beschrijvende kolommen tonen de union van volledige dienstvensters en de overlap daarvan, niet een schatting van betaalde capaciteit.
5. Doorzoek combinaties met maximaal één dienst per lokale startdag, maximaal `maximumDays`, eventueel minimum werkdagen, verplichte dagen en geen overlap. Een nachtshift telt als één dienst op zijn startdag. Elke toestand bevat betaalde minuten, aantal werkdagen, laatste eindtijd, een voorbeeld en het aantal unieke indelingen. Alleen eindtijden die vóór alle toekomstige starts liggen worden samengevoegd; hun toekomstige compatibiliteit is identiek.
6. Kies het maximum dat niet boven de toegestane betaalde weekuren ligt. Een volledige indeling moet ook het minimum halen. Een voorbeeld gebruikt bij voorkeur de laagste volledige betaalde hoeveelheid; het is geen Genesys-rooster en wordt nooit opgeslagen.

Unieke indelingen worden onderscheiden op dag, start, einde en betaalde duur. Dubbele templates met identieke tijden en duur tellen niet extra. Varianten met alleen een andere naam of andere vaste activiteiten tellen niet als extra verschuifruimte.

De rekengrenzen zijn 20.000 gegenereerde dienstvarianten, 20.000 toestanden per dag en 500.000 overgangen. Alle minuutvarianten worden onderzocht, zonder sampling. Bij overschrijding vervalt het **hele** resultaat naar onbekend; een tussentijds gevonden oplossing wordt niet als bewezen maximum gepresenteerd. Indelingentellingen worden begrensd op 10.000 en dan als ‘minstens 10.000’ getoond. Die tellerbegrenzing verandert de haalbaarheid of het maximum niet.

## Status en flexibiliteit

- **Planbaar:** er bestaat een geldige volledige combinatie die het vereiste minimum haalt en het toegestane maximum niet overschrijdt.
- **Beperkt planbaar:** er bestaan betaalde diensten/combinaties, maar de contracteis wordt niet gehaald.
- **Niet planbaar:** er bestaat binnen de ondersteunde regels geen geldige combinatie met betaalde uren.
- **Niet vast te stellen:** ontbrekende/ongeldige input, niet ondersteunde regels, onduidelijke weekgrenscontext of een rekengrens. Maximum, percentage en voorbeeld blijven leeg.

Flexibiliteit krijgt zes reproduceerbare punten: mogelijke werkdagen minus de werkdagen van het contractvoorbeeld minstens 1 / minstens 2; verschillende lokale startminuten minstens 2 / minstens 5; volledige contractindelingen minstens 2 / minstens 10. Elk criterium telt één punt. Score 0–1 = Laag, 2–4 = Gemiddeld, 5–6 = Hoog. Zonder volledige contractindeling is de indicatie Laag. Bij onbekende planbaarheid is ook flexibiliteit onbekend. Mogelijke werkdagen en starttijden worden geteld na het verwijderen van lokaal geblokkeerde diensten; het aantal volledige indelingen toetst de combinatiebeperkingen. Dit is een kwalitatieve keuze-indicator, geen optimalisatiescore of extra capaciteit.

## Ondersteund en onzeker

Ondersteund: exacte/flexibele betaalde week- en diensturen, maximum werkdagen, `minimumWorkingDaysPerWeek`, expliciete `optionalDays`, toegestane dagen, vaste/flexibele starts met startstap, betaalde-tijdgranulariteit, vast geplaatste betaalde/onbetaalde activiteiten, niet-overlappende diensten, volledige Unavailable Times-overlap, Amsterdamse DST-veilige kloktijdconversie en nachtdiensten binnen de week.

De regels worden geïnterpreteerd binnen het model van maximaal één dienst per startdag. Split shifts of meerdere losse diensten per dag worden niet samengesteld. Ontbrekende `optionalDays` betekent dat de verplichtheid van dagen onvoldoende bekend is, niet dat alle dagen automatisch optioneel zijn.

Nog niet volledig ondersteund: flexibele pauzeplaatsing, contiguous-work-regels, actieve rust-/minimumstartafstandregels, dienst-startvarianties, dag-af-regels, weekend-/planningsperioderegels, maximale opeenvolgende werkdagen over weekgrenzen en shifts van meer dan 24 uur. Ook onbekende aanvullende velden maken het resultaat onzeker. Uitgeschakelde `constrain*`-vlaggen zonder actieve bijbehorende parameters veroorzaken op zichzelf geen onzekerheid; betekenisvolle niet-ondersteunde parameters worden conservatief wel afgewezen. Er worden geen verborgen tenant-, rotatie-, override- of historische versieaannames gemaakt.

De veldbetekenissen voor activiteitplaatsing, granularity en aanvullende constraints zijn gecontroleerd tegen de officiële Genesys Go SDK-modellen (19 november 2026):
- https://github.com/MyPureCloud/platform-client-sdk-go/blob/master/platformclientv2/workplan.go
- https://github.com/MyPureCloud/platform-client-sdk-go/blob/master/platformclientv2/workplanshift.go
- https://github.com/MyPureCloud/platform-client-sdk-go/blob/master/platformclientv2/workplanactivity.go

Deze bronnen vervangen geen live acceptatie met de daadwerkelijke tenantregels en historische planversies.

## Voorbeelden en controles

| Geval | Uitkomst |
|---|---|
| 24 uur, drie vaste diensten van 8 uur | maximaal 24 uur, dekking 100%, lage flexibiliteit |
| 24 uur, 5 dagen met starts 08–13 uur, vaste duur 8 uur, max. 3 dagen | 65 vensteruren, maximaal 24 betaalde uren, 100%, hoge flexibiliteit |
| 36 uur, vier diensten van 9 uur | maximaal 36 uur, 100% |
| Van drie vaste 8-uursdiensten wordt één dienst 1 uur geblokkeerd | maximaal 16 uur, 66,7%; geen ingekorte dienst van 7 uur |
| 5 ruime vensters met iedere middag een blokkade die elke 8-uursdienst raakt | meer dan 24 vrije vensteruren, maar 0 geldige betaalde uren |
| Flexibele week 24–32 uur, vier geldige diensten van 8 uur | maximaal 32 uur toegestaan, 100% minimumdekking; voorbeeld van 24 uur |
| Mogelijke zondagse nachtdienst over een weekgrens | onbekend zonder volledige weekoverstijgende context |

`npm test`, `npm run typecheck`, `npm run build` en `npm run test:static` verifiëren de code. Tests gebruiken synthetische fixtures, waaronder meerdere medewerkers/plannen en opeenvolgende weken. Een browsercontrole moet daarnaast tabwisseling, kolommen, detailfocus, Escape en het behoud van editor-/roosterfuncties controleren. Er worden geen echte API-mutaties uitgevoerd voor de automatische controles.
