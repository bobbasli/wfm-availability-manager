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
- `src/services/workforceManagement.ts` bevat de weekgebonden Work Plan-query; assignments blijven onbevestigd tot contractvalidatie.
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
6. Lockfile en `npm ci` zijn toegevoegd; onderhoud dependencies via gecontroleerde lockfile-updates.

## Geteste herstelgrenzen
- `src/domain/time.ts`: Amsterdamse kloktijdconversie, lokale daggrenzen en exacte publicatiestatus.
- `src/domain/capacity.ts`: gevalideerde betaalde uren, DST-veilige inzetvensters, intervalvereniging en overlap.
- `src/services/regions.ts` / `oauth.ts`: exacte regiodomeinen en PKCE-verzoekopbouw.
- `src/composables/useDialogFocus.ts`: focusplaatsing, focusbegrenzing en terugkeer naar de trigger.
- De legacy JS-composable blijft incrementeel te migreren; `strict: true` betekent niet dat deze JS volledig wordt gecontroleerd.
- Verzoeken hebben selectie-/sessiecontroles vóór resultaten worden toegepast. Een gewijzigde medewerker of datum sluit de editor; gewijzigde week/marge wist capaciteit.
- `npm test` test synthetische scenario’s voor tijdzones, API-fouten, PKCE, selectieconflicten en bevestigde editormutaties. Dit vervangt geen live Genesys-acceptatie.
