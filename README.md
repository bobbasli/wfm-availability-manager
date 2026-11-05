# WFM Availability Manager v0.1.3

Correctie van de Vue-rendering: gebruikt expliciet de Vue 3 ESM browserbuild inclusief templatecompiler. Het verbindingsblok is verwijderd. Medewerkersnamen en grafische Unavailable Times-weergave zijn behouden.

## Deploy
Vervang `index.html` en `app.js` in de hoofdmap van je GitHub Pages-repository. Wacht op de Pages-deployment en ververs met Ctrl+Shift+R.

## OAuth
De OAuth Client ID en regio worden uit bestaande sessionStorage-instellingen gelezen. Als je een nieuwe browsersessie start zonder deze instellingen, open de app eenmalig met `?clientId=JOUW_CLIENT_ID&region=mypurecloud.de`. Deze waarden worden vervolgens voor de huidige browsersessie bewaard. Gebruik nooit een client secret in de URL.

## Aandachtspunten
- Vue en Tailwind worden nog via CDN geladen; Tailwind browser CDN is voor prototypes.
- Query/PATCH JSON moet nog met echte Genesys-responses worden gevalideerd.
- Grafische weergave toont alleen herkenbare tijdvakken en is nog niet bewerkbaar.
- Niet live getest in de Genesys-organisatie.
