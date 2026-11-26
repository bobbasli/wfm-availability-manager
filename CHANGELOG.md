# Changelog

## 0.3.0 — 2026-11-26 (testrelease)
- Volledige applicatiecode naar strict TypeScript; alle Vue-componenten met script setup en Composition API, geen legacy JS of allowJs.
- Kalender, capaciteit, medewerkerselectie, header en editor opgesplitst in views/componenten; sessie, gepubliceerde roosters en editor hebben eigen composables.
- Bestaande API-routes ondergebracht in een getypeerde availability-service boven de centrale Genesys-client; pure response-/tijdlijnhelpers en gedeelde types.
- Centrale Tailwind-componentklassen, licht/donker-thema en Heroicons; verbindingsinstellingen voor OAuth Client ID/regio bereikbaar in de interface.
- Leesbare formattering met Prettier en architectuurcontrole in CI. Uitgebreide tests voor parsers, themavoorkeur en bestaande gebruikersflows.
- Capaciteitsformule, 25%-marge, vijf kolommen, editorbevestiging, OAuth PKCE, historie en read-only gepubliceerde roosters behouden. De gemelde 47,5 uur is correct voor de aangeleverde Work Plan-velden; geen rekenaanpassing of overname van PR #5.
- Herstelpunt backup/pre-v0.3.0 en deploy-/terugzetinstructies in docs/DEPLOYMENT_V03.md; geen automatische merge of publicatie.


## 0.2.1 — in ontwikkeling
- Toegevoegd: alleen-lezen roosterhistorie met afzonderlijke aanmaak-, roosterbrede en agentgebonden wijzigingsdatum, vast weergegeven in Europe/Amsterdam.
- Eerste publicatie en historie per Unavailable Time blijven expliciet ‘Niet beschikbaar’: deze ontbreken in de onderzochte bestaande endpointcontracten. Geen fallback naar aanmaakdatum, blokstart of huidige tijd.
- Geteste neutrale vergelijkingslogica voor geverifieerde tijdstempels; zonder betrouwbare bronwaarden worden geen vergelijkingen getoond. Wijzigingen van andere medewerkers worden niet als agentwijziging gebruikt.
- Audit Logs en rechten onderzocht; geen extra API-calls of scopes toegevoegd. Bronnen en beperkingen vastgelegd in docs/HISTORY.md.
- Capaciteitstab vereenvoudigd tot vijf kolommen: Medewerker / Work Plan, Betaald / week, Niet beschikbaar, Planbare ruimte en Planbaarheid.
- Beschikbare tijdsruimte berekend via samengevoegde vensters minus overlappende Unavailable Times; geen maximumcapaciteit of gegenereerde dienstindeling.
- Instelbare lokaal bewaarde marge (standaard 25%) rekent percentages en kleuren direct opnieuw uit zonder nieuwe API-calls. Percentages boven 100% zijn toegestaan.
- Flexibele weekuren tonen minimum en maximum met afzonderlijke beoordelingen; nul of onbekende benodigde uren geven — met uitleg.
- Groen/oranje/rood met tekst en tooltips, plus permanente Nederlandse uitleg onder de tabel.
- Huidige/vorige Work Plans delen de detailcache en leveren de correcte vensters bij nacht- en weekgrensdiensten.
- Unit-/componenttests voor overlap, marges, bereiken, onbekende data, direct herberekenen en bestaande functionaliteit. Methode vastgelegd in docs/CAPACITY_V021.md.
- Geen automatische merge of productie-deployment.

## Herstelronde 0.2.0
- Hersteld: verouderde responses bij medewerker-/MU-wissels en verkeerde koppeling tussen editor en medewerker.
- Beveiligd: exacte regiovalidatie, sessiebinding aan OAuth-client/regio, centrale tokenuitwisseling en opruimen bij 401.
- Hersteld: Amsterdamse querygrenzen, lokale shiftstarts rond DST en exacte publicatiestatuscontrole.
- Work Plan-toewijzingen geïmplementeerd volgens het opgegeven weeklookupcontract: user.id, referentieweek, numerieke weeksleutel en lookup naar het echte plan-ID.
- Details rechtstreeks opgehaald met verplichte MU-ID en een gedeelde cache per plan-ID/refresh; ontbrekende of ongeldige assignments krijgen per medewerker een melding zonder dekking.
- Toegevoegd: regressietests voor meerdere medewerkers, planwijzigingen tussen weken, DST-weekindexering, foutieve assignments en gedeelde detailrequests. Live rotatie-/override-/planversiecontrole blijft open.
- Toegevoegd: getypeerde tijd-/capaciteitshelpers, dialoogfocusbeheer, regressietests, lockfile en CI met npm ci.
- Live Genesys-acceptatie is nog niet uitgevoerd.

## 0.2.0 — 2026-11-11
- Project opgezet voor repository `bobbasli/wfm-availability-manager`, Vue 3 Composition API, Vite, TypeScript-services en Tailwind CSS.
- Centrale Genesys HTTP-client en eerste Work Plan-query-service.
- Toegevoegd: GitHub Actions workflow met PR-build en deployment van `dist/` naar GitHub Pages op `main`.
- Toegevoegd: `AGENTS.md` voor Codex, architectuur-, API- en beslisdocumentatie, deployment-instructies.
- Onbekende Work Plan-toewijzingen blijven expliciet onbekend; geen onbetrouwbare normdekking.
- **Migratie is onvoltooid**: de bestaande Vue-composable is nog JS; API-responsevorm en runtime ongetest in Genesys. Niet zonder acceptatiechecks live zetten.

## 0.1.9.8 — migratiestap
- Eerste modulaire structuur. GitHub Actions-/Codex-documentatie toegevoegd in v0.2.0.

## 0.1.9.7 — referentiebasis
- Kalender/editor, gepubliceerd rooster en indicatief capaciteitsoverzicht. Work Plan-matching bleek onjuist en wordt opnieuw gevalideerd.
