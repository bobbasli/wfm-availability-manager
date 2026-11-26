# Besluiten uit ontwikkelgesprekken

- Dit project is een **Supervisor Client App** die in Genesys Cloud kan worden geopend als webapp; oorspronkelijk Vue 3/Tailwind via CDN, vanaf v0.2.0 via Vite.
- Hosting op GitHub Pages, broncode in eigen repo `bobbasli/wfm-availability-manager`. De aparte Queue Analytics-app draait op de eigen webserver en valt buiten deze migratie.
- GitHub Actions (niet lokale Windows-build) bouwt en publiceert; ontwikkelwijzigingen bij voorkeur via Codex + PR.
- Interface in Nederlands, bestaande blauw/indigo headerstijl aanhouden. Gebruik zo veel mogelijk heldere, kleine functies en strikte types.
- Kies Business Unit, Management Unit, agent. Bij selecteren worden Unavailable Times opgehaald en gepubliceerd rooster kan worden gezocht. Rood: bewerkbaar unavailable; groen: rooster read-only. Activity Code-kleur indien daadwerkelijk uit API beschikbaar; anders fallback.
- Kalendertijdvakken zijn lokaal leesbaar en bewerkbaar met notities; opslaan, wijzigen en verwijderen alleen met expliciete bevestiging en API-machtigingen.
- Capaciteit & beschikbaarheid is een aparte weergave met **alle agenten van de gekozen MU**. Weekselectie, Work Plan betaald urenbereik/max dagen/inzetvensters, unavailable overlap, betaalde weekuren, niet-beschikbaarheid, planbare ruimte en planbaarheid inclusief marge.
- v0.2.1 volgt de gewijzigde opdracht van 26 november 2026: indicator van tijdsruimte, inclusief instelbare marge (standaard 25%). Geen maximumcapaciteit, geen roosterberekening en geen cap op 100%.
- Het gerapporteerde bugscenario: alle medewerkers leken hetzelfde Work Plan `40 uur, geen weekend` te krijgen. Oplossingseis: **per medewerker eigen effectief Work Plan voor de geselecteerde week**; nooit dezelfde toevallige fallback of onbevestigde assignment.
- `POST .../agents/workplans/query` gebruikt `agentIds`, `startDate`, `weekCount`; het weeklookupcontract is inmiddels door de gebruiker opgegeven. Zie `docs/GENESYS_API.md`.
- Multi-tenant, geen vaste contracturen of dagpatronen; flexwerk, variabele uren, weekgebonden wijzigingen, nachtdiensten, weekenddagen en mogelijke rotaties moeten ook passen.
- Eerst functionaliteit en regressies testen in de Genesys-omgeving, daarna uitrollen. Geen commando's of deploys die live data ongemerkt wijzigen.
- Releases voorzien van versie, changelog, overzicht wijzigingen, tests en bekende beperkingen. Documentatie blijvend bruikbaar voor Codex zonder gespreksgeschiedenis.

- Work Plan-assignment-herkenning gebruikt nu het opgegeven weeklookupcontract. Alleen `user.id` en de correcte weekindex bepalen het plan; geen terugval op agentvelden, planlijsten, vorige weken of standaardplannen. Onzekere assignments blijven expliciet onbekend.
- Sessies zijn aan regio en client gebonden. Een ontbrekende binding vraagt opnieuw aanmelden; dit voorkomt hergebruik van een token bij een gewijzigde URL-configuratie.
- Alleen exacte expliciete publicatiestatussen worden geaccepteerd. Onbekende status blijft ongeschikt voor presentatie als gepubliceerd rooster.
- CI draait tests en build op PR’s naar main; alleen een push naar main publiceert. Een handmatige workflowstart bouwt en test uitsluitend. Deze herstelronde publiceert niets.

- Een gedeeltelijk onbeschikbare periode trekt alleen de overlap met vensters af, zonder een volledige dienst te blokkeren. Overlappen worden niet dubbel geteld.
- Vijf kolommen, vaste Nederlandse toelichting, per-grenskleuren bij flexibele uren, en geen stilzwijgende maximumverplichting.
- Marge wijzigt percentages/kleuren onmiddellijk op al opgehaalde ruwe gegevens; geen API-verzoeken of verlies van resultaten.
- De vorige toewijzing wordt uitsluitend gebruikt voor inkomende weekgrensvensters, nooit als fallback voor de huidige medewerkerweek.
- De indicator garandeert geen geldig Genesys-rooster. Maximaal aantal werkdagen, dienstlengtes en rustregels blijven onderdeel van die beperking.
- PR’s naar alle branches worden getest; alleen push naar main kan deployen. Deze wijziging wordt niet naar main of de testsite gepubliceerd.

- Historie: roostercreatie is nooit eerste publicatie. Alleen eigen agentmetadata mag een agentwijzigingsdatum vullen; een globale wijziging kan iemand anders betreffen.
- De huidige API-schema's bevatten geen eerste publicatiedatum of Unavailable Time-blokhistorie. De app toont daarvoor ‘Niet beschikbaar’; ook vermoedelijke ongeverifieerde responsevelden worden niet gebruikt.
- Geen extra auditqueries/scopes totdat service mapping, juiste objectscope en volledigheid van historische gegevens zijn bewezen. Neutrale vergelijking is geen bewijs van actor of oorzaak van een conflict.
