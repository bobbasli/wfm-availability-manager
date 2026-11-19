# Changelog

## 0.2.1 — in ontwikkeling
- Vervangen: vensteruren/contracturen met 25% opslag door maximaal planbare betaalde uren uit volledige dienstcombinaties; dekking maximaal 100%.
- Toegevoegd: pure TypeScript-berekening voor vaste/flexibele uren, startstappen, maximale werkdagen, expliciete optionele/verplichte dagen, vaste betaalde/onbetaalde activiteiten en onbeschikbaarheid.
- Gescheiden kwalitatieve inzetflexibiliteit op basis van dagen, starts en geldige indelingen, met reproduceerbare uitleg.
- Nieuwe tienkolomstabel en aanklikbare medewerkerdetails, met onbeschikbaarheid, regels, kandidaatdiensten, redenen en een niet-officieel voorbeeld.
- Huidige/vorige weektoewijzingen delen dezelfde detailcache; ontbrekende of grensoverschrijdende context geeft expliciet ‘Niet vast te stellen’.
- Begrensde exacte zoekruimte: bij onbekende regels of limietoverschrijding geen schijnmaximum, percentage of rooster.
- Bestaande editor, roosters en OAuth behouden; PR-controles gelden ook voor ontwikkelbranches. Geen automatische merge of deployment.
- Nieuwe unit-/componenttests en technische documentatie: `docs/CAPACITY_V021.md`.

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
