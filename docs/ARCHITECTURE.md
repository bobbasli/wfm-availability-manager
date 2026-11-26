# Architectuur — v0.3.1

## Structuur

```text
src/
  App.vue                         samenstellen en tabnavigatie
  views/CalendarView.vue          kalenderpagina en roosterkeuze
  views/CapacityView.vue          week/marge en capaciteitspresentatie
  components/                    header, selectie, tijdlijn, editor, historie, tabel
  composables/
    useAvailabilityManager.ts    selectie, laden en selectieversies
    useGenesysSession.ts         PKCE, sessiebinding, aanmelden/afmelden
    usePublishedSchedules.ts     roosterkeuze, metadata en agentrooster
    useUnavailableEditor.ts      draft, validatie, bevestigde wijziging
    useCapacity.ts               weektoewijzingen en capaciteitsdata
    useDialogFocus.ts            dialoogfocus, tabbegrenzing, focusherstel
    useTheme.ts                  lokale voorkeur licht/donker
  helpers/                       pure kalender-/response-/roosterparsers
  domain/                        pure berekeningen, tijdzones en historie
  services/                      centrale client, OAuth, regio's, WFM services
  types/                         gedeelde interfaces en selectie-/editorcontracten
```

Alle Vue-componenten gebruiken Composition API met `<script setup lang="ts">`. `strict: true`, `allowJs: false`; er is geen JavaScript-applicatiecode of typecheck-onderdrukking. `unknown` vormt de externe datagrens. Helpers controleren responsevormen voordat gegevens in getypeerde presentatie- en editorstructuren terechtkomen. Pure businesslogica blijft bewust in `domain/` in plaats van in UI-componenten.

## Eigenaarschap en dataflow

`useAvailabilityManager` coördineert de selectie en geeft bestaande refs door aan de views. Views en componenten voeren geen HTTP-verzoeken uit. `useGenesysSession` bewaart de koppeling regio/client/token. `services/availability.ts` bundelt de bestaande kalender-, medewerker- en roosterendpoints; alle verzoeken lopen via `services/genesysApi.ts`. Work Plan-query's en detailcache blijven in `workforceManagement.ts`.

Bij een selectie-/sessiewissel wordt de selectieversie verhoogd, de editor gesloten, oude roosterkeuze/-metadata gewist en lopende resultaten ongeldig gemaakt. Iedere loader controleert de actuele selectie en eigen verzoekversie. Een oud resultaat mag de nieuwe selectie niet overschrijven. Oude foutmeldingen na een editorwissel worden eveneens genegeerd. Een 401 wist de sessie en vraagt opnieuw aanmelden. Mutaties worden nooit automatisch herhaald.

De editor accepteert uitsluitend gevalideerde tijdvakken. Hij verstuurt uitsluitend `id`, `timeSpan`, `notes` en `delete` waar van toepassing, na een expliciete bevestiging. Informative geschiedenisvelden worden niet teruggeschreven. Gepubliceerde roosters gebruiken uitsluitend lees-/query-endpoints.

## Berekeningen behouden

De capaciteit gebruikt het weeklookupcontract en de vorige week voor inkomende nachtvensters, zonder fallback naar een eerste/default Work Plan. Union van inzetvensters minus de overlappende union van Unavailable Times geeft tijdsruimte. De marge wordt lokaal via computed opnieuw toegepast; percentages boven 100% blijven geldig. Geen roosterplanner, gewijzigde formule of adoptie van PR #5. De bevestigde 47,5 uur/95%-uitkomst is correct voor het besproken Work Plan.

## Styling en toegankelijkheid

Tailwind 3 blijft behouden. De centrale `@layer components` in `style.css` bevat onder andere `panel`, `card`, `input`, `btn-primary`, `text-soft` en de tabstatussen. De Tailwind 4-syntaxis uit het aangeleverde voorbeeld is vertaald naar de bestaande Tailwind 3-configuratie; geen onnodige frameworkupgrade. Dynamische kalenderposities en werkelijke API-activiteitskleuren blijven inline omdat ze gegevensafhankelijk zijn.

Het thema volgt aanvankelijk de systeemvoorkeur en bewaart een expliciete keuze lokaal. Heroicons levert zon/maan; pictogramknoppen hebben Nederlandstalige toegankelijke namen. De bestaande geteste dialoogfocus blijft behouden: eerste focus, Tab/Shift+Tab begrenzen, Escape sluiten, focus terug naar de trigger. Native selecties en buttons blijven behouden; Headless UI is niet toegevoegd voor functionaliteit die al klein en getest is. VueUse is niet nodig.

Prettier is uitsluitend ontwikkelgereedschap; `npm run format` en `format:check` bewaken leesbaarheid. De architectuurcontrole controleert getypeerde SFCs, strikte configuratie en de HTTP-servicelaag.

## Hosting, herstel en grenzen

Vite base `./` ondersteunt beide repositorypaden. CI bouwt en test PR's; alleen push naar `main` kan Pages publiceren. De oorspronkelijke bronrepository-main blijft onaangeraakt. De testrepository heeft een afzonderlijke release-PR. Zie [DEPLOYMENT_V03.md](DEPLOYMENT_V03.md).

Live Genesys-login, rechten, daadwerkelijke weekrotaties/overrides en historische planversies blijven acceptatiepunten. Audit Logs zijn niet toegevoegd. Eerste roosterpublicatie en Unavailable Time-historie zijn volgens de huidige endpointcontracten niet beschikbaar; zie HISTORY.md. Een groene test/build vervangt deze live controle niet.

## Navigatie en Original/Latest Saved v0.3.1
`useWeekSelection` is de gedeelde maandagweek voor capaciteit en kalender. `WeekNavigation` verzorgt datumselectie en vorige/volgende week. Een medewerkersknop in CapacityTable geeft een User-ID aan de coordinator, die de kalender opent en onafhankelijke loaders gebundeld start. Lopende identieke aanvragen worden gedeeld; de bestaande selectieversies blijven leidend.

`usePublishedSchedules` vraagt de geselecteerde week op en houdt gepubliceerde kalenderkeuze gescheiden van Original-vergelijkingscontext (ook ongepubliceerd). `availability.ts` bevat de officiële Original-query. De pure helper `availabilityComparison.ts` valideert, verenigt en vergelijkt intervallen per Amsterdamse dag. `UnavailableComparison` presenteert beide datasets en de verschillen. Succesvolle editormutaties melden invalidatie aan de capacity-coordinator, die alleen bij terugkeer ververst. Zie AVAILABILITY_COMPARISON.md voor contracten en beperkingen.
