# Changelog

## 0.2.1 — in ontwikkeling
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
