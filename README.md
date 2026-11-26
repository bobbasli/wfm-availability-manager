# WFM Availability Manager — v0.3.0

Nederlandstalige Genesys Cloud Supervisor Client App met Unavailable Times-editor, gepubliceerde roosters, roosterhistorie en inzicht in beschikbare planningsruimte. Vue 3 Composition API, strikt TypeScript, Vite en Tailwind CSS. Geen eigen backend en geen client secret.

## Versie 0.3

De toepassing is heringedeeld in gerichte componenten, views, composables, helpers, services en gedeelde types. Er staat geen legacy JavaScript meer in `src/`; alle Vue-bestanden gebruiken `<script setup lang="ts">`. De bestaande berekeningen en API-endpoints zijn behouden. Nieuwe gedeelde stijlen ondersteunen een licht/donker-thema. De versie staat in de kop en voettekst.

**Nog niet live geaccepteerd in Genesys:** geautomatiseerde tests en browsercontroles gebruiken synthetische gegevens. Test na deployment de echte login, rechten, kalender, editor en weektoewijzingen voordat je de nieuwe versie in gebruik neemt.

## Deployen en terugzetten

Zie **[de stapsgewijze handleiding voor versie 0.3 en herstel](docs/DEPLOYMENT_V03.md)**. Deze maakt onderscheid tussen:

- `bobbasli/wfm-availability-manager`: bronrepository en ontwikkel-PR; de eigen `main` blijft ongemoeid.
- `bobbasli/wfm-availability-manager-test`: bestaande testhosting op https://bobbasli.github.io/wfm-availability-manager-test/; merge naar de `main` van deze repository publiceert de testsite.
- Release-tag `v0.3.0`: reproduceerbare bron voor de nieuwe versie.
- Hersteltag `backup/pre-v0.3.0`: vastgelegde bestaande testversie (0.2.1).

Een PR voert controles uit. Alleen een push/merge naar `main` publiceert via GitHub Pages. `workflow_dispatch` voert uitsluitend een build uit. OAuth redirect-URI moet exact overeenkomen met de gebruikte app-URL, inclusief pad en afsluitende `/`. Laat een bestaand werkend redirectadres staan.

## Lokaal ontwikkelen

Gebruik Node.js 22 (`.nvmrc`).

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run test:static
npm run format:check
npm run build
```

GitHub Actions voert tests, architectuurcontrole, formatteringscontrole en productiebuild uit. Geen Node-installatie op je eigen computer nodig wanneer je GitHub gebruikt.

## Verbinding en functies

Open **Genesys-verbinding instellen** voor de OAuth Client ID en het ondersteunde regiodomein. Ook de bestaande URL-parameters `?clientId=...&region=mypurecloud.de` blijven werken. Configuratiewijzigingen melden de bestaande sessie af. Tokens blijven tabgebonden in sessionStorage.

Selecteer Business Unit, Management Unit en medewerker. De kalender toont bewerkbare rode Unavailable Times en uitsluitend expliciet gepubliceerde, alleen-lezen roosters. Toevoegen, wijzigen en verwijderen vereisen bevestiging. De editor hanteert Europe/Amsterdam en weigert ongeldige of dubbelzinnige invoertijden rond zomer-/wintertijd. Roosterhistorie houdt globale en eigen agentwijzigingen apart; niet beschikbare tijdstempels worden nooit verzonnen.

## Planbare ruimte

De capaciteitstab houdt vijf kolommen en de permanent zichtbare toelichting. De weektoewijzing wordt uitsluitend bepaald via `user.id`, de juiste weekindex en `workPlanLookup`; geen standaardplan. Details worden per refresh gedeeld gecachet. Huidige en vorige week bepalen de vensters bij nachtdiensten en weekgrenzen.

- Planbare ruimte = samengevoegde inzetvensters − overlappende onbeschikbaarheid.
- Benodigde ruimte = betaalde weekuren × (1 + marge / 100).
- Planbaarheid = planbare ruimte / benodigde ruimte × 100.

Marge standaard 25%, direct herberekend zonder nieuwe API-calls. Percentages boven 100% blijven toegestaan. Flexibele betaalde uren tonen beide grenzen; onbekende toewijzingen/uren leveren geen misleidend percentage. Groen: marge gehaald; oranje: betaalde uren passen maar marge niet; rood: te weinig ruimte voor de betaalde uren. Dit is geen garantie dat Genesys een geldig rooster kan genereren.

De gedeelde Work Plan-response uit de ontwikkelsessie bevestigt 08:00–09:00 startvrijheid, 480 betaalde en 30 onbetaalde minuten: dagelijks 08:00–17:30, vijf dagen 47,5 uur; bij 40 betaalde weekuren en 25% marge is 95% correct. Er wordt niets naar 50 uur geforceerd. PR #5 (extra duurvalidatie/diagnose) is geen onderdeel van deze release.

## Documentatie

- [AGENTS.md](AGENTS.md) en [.github/copilot-instructions.md](.github/copilot-instructions.md): ontwikkelafspraken.
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): structuur en eigenaarschap.
- [GENESYS_API.md](docs/GENESYS_API.md): endpoints, contracten en grenzen.
- [CAPACITY_V021.md](docs/CAPACITY_V021.md): ongewijzigde rekenmethode.
- [HISTORY.md](docs/HISTORY.md): betrouwbare tijdstempels en ontbrekende API-velden.
- [DECISIONS.md](docs/DECISIONS.md) en [CHANGELOG.md](CHANGELOG.md): keuzes en wijzigingen.
