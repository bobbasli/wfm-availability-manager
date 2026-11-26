# Codex instructions — WFM Availability Manager

Lees vóór elke wijziging `README.md`, `docs/ARCHITECTURE.md`, `docs/GENESYS_API.md`, `docs/DECISIONS.md` en `CHANGELOG.md`.

## Technische afspraken
- Vue 3 Composition API met `<script setup>`, Vite, TypeScript met `strict: true`, Tailwind CSS.
- Gebruik functionele, kleine, duidelijk benoemde functies. Scheid data-ophaling, businesslogica en UI.
- Centraliseer **alle Genesys HTTP-verzoeken** via `src/services/genesysApi.ts`; plaats domeinspecifieke API-methoden in afzonderlijke services.
- Alle applicatiecode is TypeScript; alle Vue-componenten gebruiken `<script setup lang="ts">`. `allowJs: false`. Houd de opgesplitste componenten/composables/services/helpers/types in stand.
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
- Vanaf v0.2.1: toon beschikbare planningsruimte, geen maximaal werkbare uren of gegenereerd rooster. Ruimte = inzetvensters − overlappende onbeschikbaarheid. Planbaarheid = ruimte / (betaalde weekuren × (1 + marge/100)) × 100. Marge standaard 25%, direct reactief zonder API-herophaling; percentages boven 100% zijn toegestaan.
- Toon uitsluitend vijf kolommen en vaste toelichting conform docs/CAPACITY_V021.md. Beoordeel vaste/flexibele weekuren met groen/oranje/rood en tekst per grens. Onbekende input of nul benodigde ruimte geeft —; ontbrekende weektoewijzingen worden nooit gegokt. Leg expliciet uit dat planningsruimte geen garantie op een geldig rooster is.
- Resultaten en API-errors zichtbaar en navolgbaar; geen verzonnen resultaten of stilzwijgende defaults.

- Vanaf v0.3.1: capaciteit standaard actief; medewerkerdoorklik via User-ID, gedeelde maandagweek en geen herophaling bij ongewijzigde terugkeer. Een succesvolle PATCH invalideert capaciteit; annulering niet.
- Original en Latest Saved zijn afzonderlijke gegevenssets. Gebruik het officiële `agentId` + `schedule:{id,weekDate}`-contract; `consideredInScheduleGeneration=false` is Niet gebruikt, nooit automatisch Beschikbaar. Ongepubliceerde roosters zijn uitsluitend vergelijkingscontext, geen kalenderdiensten. Zie docs/AVAILABILITY_COMPARISON.md.

## Werkwijze
1. Werk op feature branch; gebruik pull requests. `main` triggert GitHub Pages-productiedeployment.
2. Beschrijf de wijziging, geraakte bestanden, tests en risico's in de PR.
3. Voeg of wijzig tests bij bugfixes en nieuwe domeinlogica. Bouw minimaal met `npm run build`.
4. Update `CHANGELOG.md` en versienummer bij een release.
5. Geen gegevens van echte gebruikers, access tokens, ID's of API-dumps committen.
6. Houd de afzonderlijke Genesys Queue Analytics-app buiten deze repository.

## Status v0.3.0
De legacy JS-composable is vervangen door getypeerde composables. Zie `.github/copilot-instructions.md` voor de aangeleverde Vue-/TypeScript-/Tailwind-afspraken en `docs/ARCHITECTURE.md` voor de indeling. Draai ook `npm run format:check`. Gebruik geen typecheck-onderdrukking als migratieoplossing.

De ontwikkel-PR gaat naar `feature/capacity-v021`; de afzonderlijke testrelease-PR gaat naar `main` van `wfm-availability-manager-test`. Nooit zelf mergen of publiceren. Behoud `backup/pre-v0.3.0`; instructies staan in `docs/DEPLOYMENT_V03.md`. Voor live gebruik blijven PKCE-login, editor, rooster en capaciteit in Genesys te testen.
