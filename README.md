# WFM Availability Manager — v0.2.0

Vue 3 Composition API + TypeScript-services + Vite + Tailwind CSS. Browsergebaseerde Genesys Cloud Supervisor Client App: Unavailable Times-editor, gepubliceerd rooster en indicatief capaciteitsoverzicht. **Nog in migratie/test; niet direct productiegeschikt verklaren.**

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
Lokaal optioneel: `npm install`, `npm run typecheck`, `npm run build`. Geen Node-installatie op je Windows-pc vereist: GitHub Actions voert deze stappen uit. De GitHub Actions workflow gebruikt voorlopig `npm install` omdat een gevalideerd `package-lock.json` ontbreekt; lockfile genereren en overstappen op `npm ci` is een vervolgstap.

**Openstaand:** de echte response-vorm van `POST .../agents/workplans/query` is nog niet geverifieerd. Onbekende mapping leidt bewust tot geen capaciteitspercentage. Een groene build bewijst geen juiste API-scopes, OAuth redirect of werkend scenario in Genesys.
