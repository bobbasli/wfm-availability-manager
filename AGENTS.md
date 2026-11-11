# Codex instructions — WFM Availability Manager

Lees vóór elke wijziging `README.md`, `docs/ARCHITECTURE.md`, `docs/GENESYS_API.md`, `docs/DECISIONS.md` en `CHANGELOG.md`.

## Technische afspraken
- Vue 3 Composition API met `<script setup>`, Vite, TypeScript met `strict: true`, Tailwind CSS.
- Gebruik functionele, kleine, duidelijk benoemde functies. Scheid data-ophaling, businesslogica en UI.
- Centraliseer **alle Genesys HTTP-verzoeken** via `src/services/genesysApi.ts`; plaats domeinspecifieke API-methoden in afzonderlijke services.
- Nieuwe code in TypeScript; migreer de bestaande JS-composable incrementeel naar getypeerde composables en Vue-componenten. Vermijd grote risicovolle rewrites.
- Vermijd `any` in nieuwe code; valideer API-responses vanaf `unknown` voordat je ze gebruikt.
- Hergebruik types, helpers en componenten; geen hardcoded tenant-, MU-, BU-, gebruikers- of client-ID's.
- Region is configureerbaar; de demo gebruikt normaliter `mypurecloud.de` (prod-euc1). Geen client secret in de browser.
- Gebruik lokale kalenderdata in tijdzone `Europe/Amsterdam` voor gebruikersinvoer; omzetting naar Genesys API-tijden moet DST veilig zijn.
- Behoud accessibility en de Nederlandstalige interface.

## Functionele afspraken / acceptatiecriteria
- OAuth Authorization Code + PKCE (public client), redirect-URI moet exact overeenkomen met URL van de gehoste app.
- Selecties: Business Unit -> Management Unit -> medewerker.
- Toon en bewerk Unavailable Times (rood). PATCH alleen na expliciete bevestiging; geen onbedoelde bulk- of automatische wijzigingen.
- Toon gepubliceerde diensten en roosteractiviteiten *uitsluitend leesbaar* (groen of echte Activity Code-kleur indien beschikbaar). Bij geen rooster geen fictieve dienst tonen.
- Capaciteitsoverzicht per Management Unit en geselecteerde week: eigen Work Plan per medewerker. **Nooit een willekeurig/default plan aan iedereen toewijzen.**
- Work Plan-matching gebruikt het door de gebruiker opgegeven contract van `.../managementunits/{muId}/agents/workplans/query`: koppel uitsluitend `result.entities[].user.id`, bepaal de weekindex vanaf `result.referenceStartWeekDate`, lees de numerieke sleutel uit `workPlanLookupKeysPerWeek` en resolveer via `result.workPlanLookup`. Toon bij ontbrekende, onduidelijke, conflicterende of foutieve toewijzing ‘Niet vastgesteld’ en geen dekkingspercentage. Live controle van rotatie, overrides en planversies blijft vereist; verzin daarvoor geen extra responsevelden.
- Gebruik Work Plan wekelijkse betaalde uren (exact of flexibel bereik), maximaal aantal werkdagen en toegestane shiftvensters; ondersteun weekend- en nachtdiensten.
- Beschikbaarheid: overlappende Unavailable Times van mogelijke inzetvensters aftrekken; standaard marge 25%, gebruiker kan aanpassen.
- Verwachte/normatieve inzet is **indicatief**, geen roosteroptimalisatie. Geen onrealistische precisie; maximum werkdagen/rustregels zijn nog geen onderdeel van berekende capaciteit.
- Resultaten en API-errors zichtbaar en navolgbaar; geen verzonnen resultaten of stilzwijgende defaults.

## Werkwijze
1. Werk op feature branch; gebruik pull requests. `main` triggert GitHub Pages-productiedeployment.
2. Beschrijf de wijziging, geraakte bestanden, tests en risico's in de PR.
3. Voeg of wijzig tests bij bugfixes en nieuwe domeinlogica. Bouw minimaal met `npm run build`.
4. Update `CHANGELOG.md` en versienummer bij een release.
5. Geen gegevens van echte gebruikers, access tokens, ID's of API-dumps committen.
6. Houd de afzonderlijke Genesys Queue Analytics-app buiten deze repository.

## Bekende migratiestatus
v0.2.0 is het **fundament**, niet de afgeronde rewrite. `src/composables/useAvailabilityManager.js` is legacy JavaScript en moet later in kleinere `.ts` composables worden omgezet. Houd bestaande kalender/editor-functies werkend tijdens de migratie. Voor live publicatie eerst PKCE-login, Unavailable Times-editor, rooster en capaciteit in Genesys testen.
