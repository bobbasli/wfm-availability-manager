# WFM Availability Manager v0.1.1 — Vue 3 + Tailwind CSS

Omgebouwde prototypeversie van v0.1.0.

## Technologie
- Vue 3 via ES module CDN (`esm.sh`)
- Tailwind CSS via browser CDN (`cdn.tailwindcss.com`)
- Vanilla browser Fetch API, OAuth Authorization Code + PKCE
- Geen bundler of backend nodig: geschikt voor GitHub Pages

**Let op:** Tailwind browser-CDN is bedoeld voor prototypes, niet voor een definitieve productieversie. Voor productie adviseren we een Vite-build met lokaal gegenereerde Tailwind CSS en vastgepinde dependencies.

## Publiceren op GitHub Pages
1. Plaats `index.html`, `app.js` en `README.md` in de root van de repository.
2. GitHub → Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save.
3. Open de Pages-URL.
4. Voeg deze exacte URL (inclusief eventuele afsluitende slash) toe aan de Genesys OAuth Authorized redirect URIs.
5. Maak een OAuth client met Authorization Code + PKCE en gebruik alleen de client-ID.

## Functionaliteit
- Business Unit → Management Unit → medewerker
- POST `/api/v2/workforcemanagement/agents/{agentId}/unavailabletimes/query`
- Handmatige PATCH `/api/v2/workforcemanagement/agents/{agentId}/unavailabletimes`
- JSON-query editor en response-diagnose
- Expliciete bevestiging voor PATCH

## Grenzen van deze versie
- API-query body is een aanpasbare aanname (`startDate`, `endDate`); verifieer deze met de Genesys API Explorer.
- De PATCH-editor accepteert alleen handmatig ingevoerde, geldige JSON.
- Er is nog geen visuele beschikbaarheidseditor.
- OAuth-token wordt per browsertab in `sessionStorage` bewaard.
- Niet live getest tegen een Genesys Cloud-organisatie.
- De CDN-hosts moeten bereikbaar zijn en door de CSP van de Client Application worden toegestaan.
