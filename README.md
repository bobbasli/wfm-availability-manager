# WFM Availability Manager v0.1.2

Vue 3 + Tailwind CSS (CDN prototype), GitHub Pages compatible.

## Wijzigingen
- OAuth-instellingen verborgen voor supervisors. Bestaande configuratie in sessionStorage of URL `?clientId=...&region=mypurecloud.de` wordt gebruikt. De client-ID is niet geheim; gebruik nooit een client secret.
- Namen van medewerkers worden zo nodig opgehaald met `GET /api/v2/users/{id}`. Bij onvoldoende permissies blijft de ID zichtbaar.
- Grafisch dagoverzicht met unavailable times. Ondersteunt herkenbare datum/tijd-paren en datumgebonden interval-arrays; onbekende responses worden niet als beschikbaarheid geïnterpreteerd.
- Technische PATCH-editor blijft beschikbaar, zonder automatische wijzigingen.

## Testen
Upload `index.html` en `app.js` naar de root van GitHub Pages. Test OAuth, medewerkerselectie en query. De daadwerkelijke response-structuur van Genesys is nog niet gevalideerd; bij een niet-herkende response toont de applicatie een melding en de ruwe API-data. Voor productie: Vite-build, gecompileerde Tailwind CSS, API-contractvalidatie en verdere UX-tests.
