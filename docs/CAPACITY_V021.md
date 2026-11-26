# Capaciteit & beschikbaarheid v0.2.1 — planningsruimte

## Doel en vijf kolommen

Deze tab meet beschikbare tijdsruimte om diensten te plaatsen. Zij berekent geen maximaal werkbare betaalde uren, toetst geen volledige dienstcombinaties en genereert geen rooster. De interface toont uitsluitend:

1. Medewerker / Work Plan: naam met daaronder het werkelijk toegewezen plan.
2. Betaald / week: vaste uren of minimum–maximum bij flexibele weekuren.
3. Niet beschikbaar: overlap van samengevoegde Unavailable Times met de inzetvensters.
4. Planbare ruimte: overgebleven vensteruren na die overlap.
5. Planbaarheid: percentage ten opzichte van betaalde weekuren inclusief marge, met een tekstuele kleurbetekenis.

De permanent zichtbare sectie **Toelichting bij de cijfers** beschrijft alle begrippen, flexibele bereiken en kleuren. Inzetvensters blijven intern beschikbaar, maar krijgen geen eigen kolom. Er worden geen dienstvoorbeelden, maximumcapaciteit of flexibiliteitsscores getoond.

## Formules en marge

- Planbare ruimte = union van inzetvensters in uren − overlap met de union van Unavailable Times in uren.
- Benodigde ruimte = betaalde weekuren × (1 + marge / 100).
- Planbaarheid = planbare ruimte / benodigde ruimte × 100.

Percentages worden niet begrensd op 100%. Bij 24 betaalde uren, 25% marge en 50 uur planbare ruimte is de benodigde ruimte 30 uur en de indicator 166,7%. Dit betekent extra **planningsruimte**, niet dat de medewerker 50 betaalde uren mag werken.

De marge start op 25%, wordt lokaal bewaard onder `wfm_capacity_margin` en ondersteunt 0–100%. Een geldige opgeslagen marge wordt hergebruikt; ongeldige opslag valt terug op 25%. Lege, negatieve, niet-numerieke en te grote invoer geeft een uitleg zonder percentage. Alleen geldige waarden worden bewaard.

`CapacityTable.vue` berekent via Vue `computed` de beoordeling uit de opgehaalde ruwe waarden en de huidige marge. Een margewijziging doet **geen** API-verzoek, wist geen resultaten en rekent kleuren/percentages meteen opnieuw uit. Een wijziging van week, MU, sessie of medewerkerslijst maakt de opgehaalde resultaten wel ongeldig.

## Kleuren, ook bij flexibele uren

- Groen: ruimte ≥ betaalde uren inclusief marge, percentage ≥100%.
- Oranje: betaalde uren ≤ ruimte < betaalde uren inclusief marge.
- Rood: ruimte < betaalde uren, dus ook zonder marge onvoldoende ruimte.

Bij flexibele uren worden minimum en maximum afzonderlijk beoordeeld. De onderkant van het percentagebereik hoort bij het hoogste aantal betaalde uren; de bovenkant bij het laagste. De grenslabels en kleuren vermelden uitdrukkelijk welke uren worden beoordeeld. Het maximum is geen stilzwijgende verplichting. Bijvoorbeeld 24–32 betaalde uren met 30 uur ruimte en 25% marge geeft 75–100%: groen bij 24 uur en rood bij 32 uur.

Bij onbekende uren, ontbrekende/ongeldige plannen of benodigde ruimte van nul uur staat er **—** met uitleg. Binnen een flexibel bereik met minimum nul wordt die grens niet als een percentage getoond; een positieve maximumgrens kan wel apart worden beoordeeld. Een afrondingstolerantie van 1e-9 voorkomt dat een exact 100%-geval door binaire kommagetallen oranje wordt.

## Weektoewijzing en vensters

De bestaande centrale Genesys-client en lookup blijven intact: `user.id` → index vanaf `referenceStartWeekDate` → `workPlanLookupKeysPerWeek` → `workPlanLookup` → echt plan-ID. Een ontbrekende toewijzing wordt nooit vervangen door een eerste/default plan.

De huidige en vorige week worden apart opgevraagd met dezelfde MU. De gedeelde detailcache per MU/refresh voorkomt dubbele requests, ook voor gelijktijdige verzoeken of een plan dat in beide weken geldt. De vorige week levert alleen inkomende zondagse nachtdienstvensters; de geselecteerde week levert de vensters van maandag tot en met zondag. Beide worden afgeknipt op de lokale Amsterdamse weekgrenzen en daarna samengevoegd. Zo wordt bij een weekwissel niet ten onrechte het huidige Work Plan op de vorige zondag toegepast. Zonder betrouwbare vorige context worden inkomende vensters niet verzonnen: de ruimte blijft onbekend.

Een dienstvenster is een buitenenvelop van vroegste start tot laatste start + maximale betaalde dienstduur + expliciet onbetaalde activiteiten. Exacte starts en duren geven een enkel venster. De lokale starttijd wordt omgezet met Europe/Amsterdam, de duur is verstreken tijd. Dubbele/overlappende templates en Unavailable Times worden verenigd voordat uren worden geteld. Onbeschikbaarheid buiten de vensters telt niet mee; een gedeeltelijke overlap trekt alleen die tijd af en verwijdert niet de hele dienst.

Een `constrainDayOff`-vlag is een aanvullende dag-af-regel voor een dienst, geen bewijs dat de betreffende shift zelf een vrije dag is. Zij verwijdert de tijdsenvelop daarom niet. Andere regels zoals maximale werkdagen, verplichte dagen, rust en periodebeperkingen worden niet als roosterbewijs doorgerekend. Ongeldige tijden, onbekende activiteitduur of vensters langer dan 24 uur geven een uitleg zonder betrouwbaar ruimteresultaat. Die 24-uursgrens maakt vorige-zondagcontext voldoende voor inkomende vensters; langere diensten vereisen meer context. DST-ambiguïteit wordt niet gegokt.

## Implementatie en tests

- `src/domain/capacity.ts`: betaalde weekuren, vensters voor expliciete startdagen, vereniging en intervaloverlap.
- `src/domain/planningSpace.ts`: pure ruimteberekening en afzonderlijke marge-/kleurbeoordeling.
- `src/composables/useCapacity.ts`: centrale API-ophaling, huidige/vorige toewijzingen, caching, opslag van marge en bescherming tegen verouderde responses.
- `src/components/CapacityTable.vue`: vijf kolommen, reactieve berekening, grenslabels, statustekst/tooltips en vaste toelichting.

Tests dekken vaste/flexibele weekuren, nul/verschillende/ongeldige marges, grenswaarden en percentages boven 100%, overlappende en externe onbeschikbaarheid, nacht- en weekgrensvensters, verschillende plannen tussen weken, ongeldige data, directe herberekening zonder API-calls en behoud van OAuth/editor/roosterweergave. Gebruik `npm test`, `npm run typecheck`, `npm run build` en `npm run test:static`.

**De planbaarheid is een indicator van de beschikbare tijdsruimte. Het is geen garantie dat Genesys Cloud daadwerkelijk een geldig rooster kan genereren. Hierbij spelen ook andere Work Plan-regels een rol, zoals maximale werkdagen, dienstlengtes en rusttijden.**
