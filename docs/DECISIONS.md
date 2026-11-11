# Besluiten uit ontwikkelgesprekken

- Dit project is een **Supervisor Client App** die in Genesys Cloud kan worden geopend als webapp; oorspronkelijk Vue 3/Tailwind via CDN, vanaf v0.2.0 via Vite.
- Hosting op GitHub Pages, broncode in eigen repo `bobbasli/wfm-availability-manager`. De aparte Queue Analytics-app draait op de eigen webserver en valt buiten deze migratie.
- GitHub Actions (niet lokale Windows-build) bouwt en publiceert; ontwikkelwijzigingen bij voorkeur via Codex + PR.
- Interface in Nederlands, bestaande blauw/indigo headerstijl aanhouden. Gebruik zo veel mogelijk heldere, kleine functies en strikte types.
- Kies Business Unit, Management Unit, agent. Bij selecteren worden Unavailable Times opgehaald en gepubliceerd rooster kan worden gezocht. Rood: bewerkbaar unavailable; groen: rooster read-only. Activity Code-kleur indien daadwerkelijk uit API beschikbaar; anders fallback.
- Kalendertijdvakken zijn lokaal leesbaar en bewerkbaar met notities; opslaan, wijzigen en verwijderen alleen met expliciete bevestiging en API-machtigingen.
- Capaciteit & beschikbaarheid is een aparte weergave met **alle agenten van de gekozen MU**. Weekselectie, Work Plan betaald urenbereik/max dagen/inzetvensters, unavailable overlap, netto beschikbaar, marge en normdekking.
- Marge standaard 25% maar instelbaar. De norm is betaalde uren × (1+marge); beschikbaarheid is berekend op mogelijke dienstvensters en overlappende unavailable times, geen garantie dat het rooster maakbaar is.
- Het gerapporteerde bugscenario: alle medewerkers leken hetzelfde Work Plan `40 uur, geen weekend` te krijgen. Oplossingseis: **per medewerker eigen effectief Work Plan voor de geselecteerde week**; nooit dezelfde toevallige fallback of onbevestigde assignment.
- `POST .../agents/workplans/query` request-body via API Explorer: `agentIds`, `startDate`, `weekCount`; response-verificatie staat open.
- Multi-tenant, geen vaste contracturen of dagpatronen; flexwerk, variabele uren, weekgebonden wijzigingen, nachtdiensten, weekenddagen en mogelijke rotaties moeten ook passen.
- Eerst functionaliteit en regressies testen in de Genesys-omgeving, daarna uitrollen. Geen commando's of deploys die live data ongemerkt wijzigen.
- Releases voorzien van versie, changelog, overzicht wijzigingen, tests en bekende beperkingen. Documentatie blijvend bruikbaar voor Codex zonder gespreksgeschiedenis.
