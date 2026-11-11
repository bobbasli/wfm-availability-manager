# Changelog

## Nog niet uitgebracht
- Hersteld: verouderde responses bij medewerker-/MU-wissels en verkeerde koppeling tussen editor en medewerker.
- Beveiligd: exacte regiovalidatie, sessiebinding aan OAuth-client/regio, centrale tokenuitwisseling en opruimen bij 401.
- Hersteld: Amsterdamse querygrenzen, lokale shiftstarts rond DST en exacte publicatiestatuscontrole.
- Work Plan-toewijzingen blijven nu volledig onbevestigd totdat het productiecontract inclusief week/rotatie/override/planversie is gevalideerd.
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
