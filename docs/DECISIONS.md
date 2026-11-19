# Besluiten uit ontwikkelgesprekken

- Dit project is een **Supervisor Client App** die in Genesys Cloud kan worden geopend als webapp; oorspronkelijk Vue 3/Tailwind via CDN, vanaf v0.2.0 via Vite.
- Hosting op GitHub Pages, broncode in eigen repo `bobbasli/wfm-availability-manager`. De aparte Queue Analytics-app draait op de eigen webserver en valt buiten deze migratie.
- GitHub Actions (niet lokale Windows-build) bouwt en publiceert; ontwikkelwijzigingen bij voorkeur via Codex + PR.
- Interface in Nederlands, bestaande blauw/indigo headerstijl aanhouden. Gebruik zo veel mogelijk heldere, kleine functies en strikte types.
- Kies Business Unit, Management Unit, agent. Bij selecteren worden Unavailable Times opgehaald en gepubliceerd rooster kan worden gezocht. Rood: bewerkbaar unavailable; groen: rooster read-only. Activity Code-kleur indien daadwerkelijk uit API beschikbaar; anders fallback.
- Kalendertijdvakken zijn lokaal leesbaar en bewerkbaar met notities; opslaan, wijzigen en verwijderen alleen met expliciete bevestiging en API-machtigingen.
- Capaciteit & beschikbaarheid is een aparte weergave met **alle agenten van de gekozen MU**. Weekselectie, Work Plan betaald urenbereik/max dagen/inzetvensters, unavailable overlap, maximaal planbare betaalde uren, planbaarheid, flexibiliteit en status.
- Vanaf v0.2.1 is de individuele 25%-opslag verwijderd. Planbaarheid gebruikt betaalde uren uit geldige dienstcombinaties, met maximaal 100% dekking. Inzetflexibiliteit wordt apart en kwalitatief getoond.
- Het gerapporteerde bugscenario: alle medewerkers leken hetzelfde Work Plan `40 uur, geen weekend` te krijgen. Oplossingseis: **per medewerker eigen effectief Work Plan voor de geselecteerde week**; nooit dezelfde toevallige fallback of onbevestigde assignment.
- `POST .../agents/workplans/query` gebruikt `agentIds`, `startDate`, `weekCount`; het weeklookupcontract is inmiddels door de gebruiker opgegeven. Zie `docs/GENESYS_API.md`.
- Multi-tenant, geen vaste contracturen of dagpatronen; flexwerk, variabele uren, weekgebonden wijzigingen, nachtdiensten, weekenddagen en mogelijke rotaties moeten ook passen.
- Eerst functionaliteit en regressies testen in de Genesys-omgeving, daarna uitrollen. Geen commando's of deploys die live data ongemerkt wijzigen.
- Releases voorzien van versie, changelog, overzicht wijzigingen, tests en bekende beperkingen. Documentatie blijvend bruikbaar voor Codex zonder gespreksgeschiedenis.

- Work Plan-assignment-herkenning gebruikt nu het opgegeven weeklookupcontract. Alleen `user.id` en de correcte weekindex bepalen het plan; geen terugval op agentvelden, planlijsten, vorige weken of standaardplannen. Onzekere assignments blijven expliciet onbekend.
- Sessies zijn aan regio en client gebonden. Een ontbrekende binding vraagt opnieuw aanmelden; dit voorkomt hergebruik van een token bij een gewijzigde URL-configuratie.
- Alleen exacte expliciete publicatiestatussen worden geaccepteerd. Onbekende status blijft ongeschikt voor presentatie als gepubliceerd rooster.
- CI draait tests en build op PR’s naar main; alleen een push naar main publiceert. Een handmatige workflowstart bouwt en test uitsluitend. Deze herstelronde publiceert niets.

- v0.2.1: een vaste dienst wordt bij gedeeltelijke onbeschikbaarheid niet ingekort. Maximaal één dienst per lokale startdag, maximale werkdagen en volledige dienstduur worden in combinaties getoetst.
- Onbekende regels, ontbrekende verplichte/optionele daginformatie, onduidelijke weekgrenzen of rekengrenzen leiden tot ‘Niet vast te stellen’, niet tot een benadering met een groen percentage.
- Voorbeeldindelingen zijn uitsluitend uitleg, geen officiële gepubliceerde roosters en geen mutaties richting Genesys.
- Vanaf v0.2.1 worden PR’s naar alle branches getest; alleen een push naar main kan deployen. De ontwikkelbranch van deze opdracht wordt niet naar main gemerged en niet naar de testsite of productie gepusht.
