# WFM Availability Manager v0.1.6

Vue 3 + Tailwind CSS prototype voor GitHub Pages.

## Nieuw
- Klik op een rood tijdvak om de volledige oorspronkelijke registratie te bewerken.
- Toevoegen, wijzigen en verwijderen via `PATCH /api/v2/workforcemanagement/agents/{agentId}/unavailabletimes`.
- Alleen het betreffende tijdvak wordt in `entities` meegestuurd.
- Bij toevoegen wordt `id` weggelaten; bij wijzigen wordt `id` meegegeven; bij verwijderen `{id,delete:true}`. Dit is een interpretatie van het aangeleverde schema; **test deze varianten eerst op een testagent**.
- Start/eindtijd met datum; conversie van Europe/Amsterdam naar UTC, inclusief detectie van ongeldige/dubbelzinnige DST-tijden.
- Bevestiging vóór PATCH; opnieuw ophalen na succes.
- Technische handmatige PATCH-editor verwijderd; API-diagnose behouden.

## Publiceren
Vervang `index.html` en `app.js` in de root van de GitHub Pages-repository. De OAuth Client ID en regio worden uit bestaande sessionStorage of URL-parameters gebruikt.

## Grenzen
Niet live getest tegen Genesys Cloud. PATCH-body is gebaseerd op het door de gebruiker verstrekte voorbeeldschema. Bij een afwijzing van een nieuw tijdvak controleer eerst of Genesys een lege `id` vereist. De grafische tijdlijn toont dagen binnen het geselecteerde datumbereik; een tijdvak dat over middernacht loopt opent als één volledige registratie. Tailwind CDN is prototypegebruik, geen productie-build.
