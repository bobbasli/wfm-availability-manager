# WFM Availability Manager — v0.2.1

Vue 3 Composition API + TypeScript-services + Vite + Tailwind CSS. Browsergebaseerde Genesys Cloud Supervisor Client App: Unavailable Times-editor, gepubliceerd rooster en inzicht in beschikbare planningsruimte. **Nog in migratie/test; niet direct productiegeschikt verklaren.**

## Jouw GitHub repository
- Broncode: https://github.com/bobbasli/wfm-availability-manager
- Projectsite na inschakelen van GitHub Pages: https://bobbasli.github.io/wfm-availability-manager/
- De `github.com`-link toont de **repository**, niet de uitvoerbare webapp. In Genesys Cloud gebruik je de Pages-URL of een ingestelde eigen domeinnaam, plus eventueel `?clientId=...&region=mypurecloud.de`.

## Direct uploaden via GitHub (geen Node.js op je Windows-pc nodig)
1. Download en pak de v0.2.0 ZIP uit. **Upload de inhoud van de map**, niet de omvattende map of alleen de ZIP.
2. Open de GitHub repository en kies bij voorkeur eerst een **nieuwe branch** (bijv. `release/v0.2.0`) om de huidige live code te beschermen.
3. Gebruik `Add file > Upload files` om **bronbestanden en mappen** naar de root van de branch te uploaden. Let op: GitHub-browserupload kan verborgen `.github` en `.gitignore` folders/bestanden onhandig verwerken; controleer altijd dat `.github/workflows/deploy.yml` echt aanwezig is. Als verborgen bestanden ontbreken, maak ze via `Add file > Create new file` handmatig met de exacte paden (de ZIP bevat hun inhoud).
4. Maak een pull request naar `main`. Die draait alleen een controle-build; na acceptatie zal de merge naar `main` automatisch een nieuwe site publiceren.
5. Ga in de repository naar `Settings > Pages > Build and deployment > Source` en selecteer **GitHub Actions**. Dat moet eenmalig gebeuren voordat GitHub Pages kan deployen.
6. Controleer in de tab `Actions` of build en deployment groen zijn. Open de Pages-URL hierboven. Als de site op een custom domain draait, gebruik de werkelijke URL in OAuth.
7. Controleer in Genesys Cloud OAuth-clientinstellingen de **exacte redirect-URI** inclusief het trailing `/`: `https://bobbasli.github.io/wfm-availability-manager/`. Alleen aanpassen als deze ook echt de app-URL is, en nooit het bestaande werkende redirectadres zonder overgangsplan weghalen.

**Belangrijk:** `main` is momenteel een oude statische CDN-app. Als je direct in `main` uploadt, kan GitHub Pages automatisch overschakelen op de nieuwe build en een werkende app onderbreken. Test bij voorkeur eerst via preview / tijdelijke testhosting of een release branch. Een PR-build controleert alleen de code, niet het inloggen met Genesys.

## Ontwikkelen in Codex
Verbind Codex met deze repository en verwijs naar `AGENTS.md`. Start je werk vanaf een feature branch. Codex kan de repo analyseren zonder deze volledige chat; technische feiten, randvoorwaarden en openstaande punten staan in:
- `AGENTS.md` — werkwijze en niet-onderhandelbare afspraken.
- `docs/ARCHITECTURE.md` — systeem, structuur, hosting en TODO.
- `docs/GENESYS_API.md` — bekende API-routes, request-body's en onzekerheden.
- `docs/DECISIONS.md` — functionele keuzes en bughistorie.
- `CHANGELOG.md` — versies en wijzigingen.

## Broncode
`src/App.vue` houdt voorlopig de bestaande interface bij elkaar; `src/composables/useAvailabilityManager.js` bevat nog legacy JS. `src/services/genesysApi.ts` is de centrale API-client, `src/services/workforceManagement.ts` bevat de voorlopige Work Plan-toewijzingsparser. `src/types/genesys.ts` bevat strict-TS type-definities. Nieuwe code zoveel mogelijk in TypeScript en afzonderlijke componenten/composables.

## Tests en beperkingen
Lokaal: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`. Gebruik Node.js 22 (zie `.nvmrc`). Geen Node-installatie op je Windows-pc vereist: GitHub Actions voert deze stappen uit. GitHub Actions installeert reproduceerbaar via `npm ci` en voert regressietests, de statische migratiecheck en de productiebuild uit.

**Work Plan-toewijzing:** de app gebruikt het door de gebruiker opgegeven weeklookupcontract: `result.entities[].user.id`, `workPlanLookupKeysPerWeek`, `referenceStartWeekDate` en `workPlanLookup`. Per medewerker wordt uitsluitend de sleutel voor de gekozen week gebruikt. Ontbrekende of ongeldige toewijzingen blijven ‘Niet vastgesteld’, zonder percentage. Details worden per plan-ID en refresh gecachet. Live controle van rotaties, overrides en planversies blijft nodig; een groene build bewijst geen juiste API-scopes of live gegevens.

## Capaciteit & beschikbaarheid v0.2.1

De tab toont vijf kolommen: **Medewerker / Work Plan**, **Betaald / week**, **Niet beschikbaar**, **Planbare ruimte** en **Planbaarheid**. Zij geeft aan hoeveel tijdsruimte Genesys WFM heeft om diensten te plaatsen; zij berekent geen maximaal werkbare uren en genereert geen rooster.

Planbare ruimte = samengevoegde inzetvensteruren − overlappende Unavailable Times. Benodigde ruimte = betaalde weekuren × (1 + marge / 100). Planbaarheid = planbare ruimte / benodigde ruimte × 100. De marge is standaard 25% en werkt onmiddellijk, zonder nieuwe API-ophaling. Percentages boven 100% geven extra planningsruimte aan.

Bij 24 betaalde uren, 25% marge en 30 uur ruimte is de indicator 100%. Bij 50 uur ruimte is deze 166,7%, zonder te suggereren dat de medewerker 50 betaalde uren mag werken. Groen betekent voldoende ruimte inclusief marge, oranje voldoende voor de betaalde uren maar niet de marge, rood onvoldoende voor de betaalde uren. Teksten en tooltips leggen dit uit.

Flexibele weekuren tonen beide grenzen met afzonderlijke percentages en kleuren; het maximum is geen automatische verplichting. Bij onbekende data of nul benodigde ruimte staat er — met toelichting. Huidige en vorige weektoewijzingen bepalen de juiste vensters bij nachtdiensten en weekwisselingen, zonder standaardplan.

De vaste uitleg **Toelichting bij de cijfers** staat direct onder de tabel. De indicator is geen garantie op een geldig rooster: maximale werkdagen, dienstlengtes, rust en andere Work Plan-regels spelen ook een rol. Zie [de methode en beperkingen](docs/CAPACITY_V021.md).

OAuth PKCE, BU/MU/medewerkerselectie, de Unavailable Times-editor en gepubliceerde roosters blijven behouden. Tests gebruiken synthetische gegevens. Een PR naar de ontwikkelbranch voert geen productie-deployment uit.

## Rooster- en beschikbaarheidshistorie
Boven de kalender staan afzonderlijk de aanmaakdatum van het rooster, eerste publicatie, laatste roosterbrede wijziging en laatste wijziging van het geselecteerde agentrooster. Geldige datums worden weergegeven als `18-11-2026 14:35` in Europe/Amsterdam. De bestaande metadata documenteert roostercreatie en rooster-/agentwijziging, maar geen eerste publicatiedatum. Die staat daarom op **Niet beschikbaar**, zonder creatiedatum als vervanging.

Het bestaande bewerkvenster toont alleen-lezen Aan-gemaakt op, Laatst gewijzigd op en Gewijzigd door. De bestaande Unavailable Time-response documenteert deze gegevens niet, dus ook daar staat **Niet beschikbaar**. Er worden geen historievelden meegestuurd met wijzigingen. Een vóór-/na-vergelijking wordt alleen getoond bij twee betrouwbare bronwaarden; die ontbreken op dit API-pad voor blokhistorie/publicatie. Een wijziging aan een andere medewerker wordt nooit als agentwijziging gebruikt.

Audit Logs zijn onderzocht, maar er zijn geen extra calls of rechten toegevoegd. Zie [HISTORY.md](docs/HISTORY.md) voor de complete veldmatrix, bronnen en beperkingen. Een wijziging na publicatie bewijst geen actor of roosterconflict.
