# Architectuur — v0.2.1

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
- `src/services/workforceManagement.ts` bevat de weekgebonden Work Plan-query; met strikt gevalideerde weeklookup en cache voor detailrequests.
- `src/types/genesys.ts` definieert de eerste domeintypes.
- `src/style.css`, Tailwind- en PostCSS-configuratie verzorgen styling.

## Dataflow
OAuth PKCE -> token in sessionStorage -> Genesys API-client -> BU/MU/agent -> Unavailable Times en gepubliceerd rooster -> Vue presentatie.
Capaciteit: geselecteerde MU + week -> huidige en vorige weektoewijzing per user.id -> gedeelde Work Plan-detailcache -> Unavailable Times -> gevalideerde volledige kandidaatdiensten -> exacte combinaties binnen dag-/weekgrenzen -> maximaal betaalde uren en minimumdekking (maximaal 100%). Flexibiliteit wordt afzonderlijk bepaald. Fout/onbekend -> expliciete waarschuwing en geen percentage.

## Security
Geen eigen backend. Browser-token wordt alleen gebruikt richting Genesys. De huidige implementatie bewaart het token voor de tab in `sessionStorage`; nooit tokens of client secrets loggen/commiten. OAuth `state` en PKCE verifier. Beperk OAuth scopes tot werkelijk noodzakelijke machtigingen en controleer per endpoint. De API-client bevat diagnose-informatie: deel die niet publiek zonder redactie.

## TODO voor Codex
1. Valideer de geïmplementeerde weeklookup met live Genesys-gegevens, inclusief rotaties, overrides en historische planversies. Synthetische fixtures dekken meerdere medewerkers/weken en ongeldige mappings.
2. Split editor, weektijdlijn, roosterselectie en capaciteitstabel naar SFCs, composables en services.
3. Migreer legacy JS naar strikte TS (schakel `allowJs` en `checkJs` uiteindelijk uit/aan conform einddoel).
4. Unit-tests voor tijdzone DST (zomer-/wintertijd), nachtshift, overlap, flexuren, planwijziging en ambiguïteit.
5. Controleer API-paginering, 401/token expiry, ongeautoriseerde states en race conditions bij wisselen van MU.
6. Lockfile en `npm ci` zijn toegevoegd; onderhoud dependencies via gecontroleerde lockfile-updates.

## Geteste herstelgrenzen
- `src/domain/time.ts`: Amsterdamse kloktijdconversie, lokale daggrenzen en exacte publicatiestatus.
- `src/domain/capacity.ts`: gevalideerde betaalde uren, DST-veilige inzetvensters, intervalvereniging en overlap.
- `src/services/regions.ts` / `oauth.ts`: exacte regiodomeinen en PKCE-verzoekopbouw.
- `src/composables/useDialogFocus.ts`: focusplaatsing, focusbegrenzing en terugkeer naar de trigger.
- De legacy JS-composable blijft incrementeel te migreren; `strict: true` betekent niet dat deze JS volledig wordt gecontroleerd.
- Verzoeken hebben selectie-/sessiecontroles vóór resultaten worden toegepast. Een gewijzigde medewerker of datum sluit de editor; gewijzigde week of medewerkerlijst wist capaciteit.
- `npm test` test synthetische scenario’s voor tijdzones, API-fouten, PKCE, selectieconflicten en bevestigde editormutaties. Dit vervangt geen live Genesys-acceptatie.

Work Plan-dataflow: `user.id` → kalenderweekindex vanaf `referenceStartWeekDate` → numerieke sleutel in `workPlanLookupKeysPerWeek` → `workPlanLookup` → expliciet plan-ID → gevalideerde detailresponse via de centrale client. De MU-/refreshgebonden detailcache deelt promises; ontbrekende of ongeldige mappings krijgen per rij een melding zonder percentage.

## v0.2.1
- `src/domain/plannability.ts`: pure TypeScript-solver met expliciete regelvalidatie, begrensde enumeratie/dynamische toestanden, betaalde uren, onbekendheidsredenen en aparte flexibiliteitsindicator.
- `src/composables/useCapacity.ts`: strikt getypeerde data-ophaling, huidige/vorige weekcontext, detailcache en bescherming tegen verouderde selecties. API-verzoeken blijven via `genesysApi.ts` lopen.
- `src/components/CapacityTable.vue`: nieuwe tienkolomstabel en toegankelijk detailvenster met focusbeheer, Escape en focusherstel.
- De overige legacy UI-logica wordt niet herschreven. `capacity.ts` levert hergebruikte interval-/urenhelpers; zijn oude vensterenvelop is geen planningsbewijs en voedt de nieuwe planbaarheid niet.
- Zie [CAPACITY_V021.md](CAPACITY_V021.md) voor ondersteunde regels, rekengrenzen, voorbeelden en resterende beperkingen.
