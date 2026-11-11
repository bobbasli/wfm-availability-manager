# Architectuur — v0.2.0

## Hosting / releaseproces
Repository: https://github.com/bobbasli/wfm-availability-manager
GitHub Pages (normale projectsite): https://bobbasli.github.io/wfm-availability-manager/
Branch `main`: GitHub Actions bouwt Vite en publiceert `dist/`. Pull requests doen alleen een build. **Voorwaarde:** `Settings > Pages > Build and deployment > Source: GitHub Actions`.
Vite base `./` ondersteunt het projectpad. De repository-URL op github.com is geen uitvoerbare app-URL. OAuth redirect-URI in Genesys moet exact de Pages-URL zijn (inclusief `/`), tenzij een custom domain wordt gebruikt.

## Componenten
- `src/main.ts` initialiseert Vue.
- `src/App.vue` is voorlopig het complete scherm (kalender, dialog, capaciteit). Nog opsplitsen.
- `src/composables/useAvailabilityManager.js` bevat de bestaande UI- en domeinlogica; legacy, wordt incrementeel gemigreerd.
- `src/services/genesysApi.ts` bevat de centrale authenticated HTTP-client en paginering.
- `src/services/workforceManagement.ts` bevat een voorlopige, defensieve interpretatie van de weekgebonden Work Plan-response.
- `src/types/genesys.ts` definieert de eerste domeintypes.
- `src/style.css`, Tailwind- en PostCSS-configuratie verzorgen styling.

## Dataflow
OAuth PKCE -> token in sessionStorage -> Genesys API-client -> BU/MU/agent -> Unavailable Times en gepubliceerd rooster -> Vue presentatie.
Capaciteit: geselecteerde MU + ISO-week -> Work Plans -> weekgebonden Work Plan-assignments per agent -> dienstvensters -> overlap met Unavailable Times -> indicatief dekkingspercentage. Fout/onbekend -> expliciete waarschuwing en geen percentage.

## Security
Geen eigen backend. Browser-token wordt alleen gebruikt richting Genesys. De huidige implementatie bewaart het token voor de tab in `sessionStorage`; nooit tokens of client secrets loggen/commiten. OAuth `state` en PKCE verifier. Beperk OAuth scopes tot werkelijk noodzakelijke machtigingen en controleer per endpoint. De API-client bevat diagnose-informatie: deel die niet publiek zonder redactie.

## TODO voor Codex
1. Bouw en bevestig werkelijke Genesys-response van `agents/workplans/query`; maak fixtures, tests en betrouwbare assignment-parser inclusief week/rotatie.
2. Split editor, weektijdlijn, roosterselectie en capaciteitstabel naar SFCs, composables en services.
3. Migreer legacy JS naar strikte TS (schakel `allowJs` en `checkJs` uiteindelijk uit/aan conform einddoel).
4. Unit-tests voor tijdzone DST (zomer-/wintertijd), nachtshift, overlap, flexuren, marge, planwijziging en ambiguïteit.
5. Controleer API-paginering, 401/token expiry, ongeautoriseerde states en race conditions bij wisselen van MU.
6. Voeg lockfile toe en switch GitHub Actions van `npm install` naar `npm ci` zodra dependency-resolutie kan draaien.
