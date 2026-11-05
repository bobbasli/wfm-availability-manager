# WFM Availability Manager v0.1.8

Gebaseerd op werkende v0.1.7. Behoudt bewerken/toevoegen/verwijderen van Unavailable Times.

## Nieuw
- Read-only roosterpaneel met GET `/api/v2/workforcemanagement/managementunits/{managementUnitId}/agents/{agentId}/schedules`.
- Beperkte herkenning van roosterdiensten; ruwe API-response voor verificatie.
- Fouten bij rooster-API hebben geen invloed op de bestaande Unavailable Times-editor.
- Work Plan is nog niet gekoppeld; geen onbevestigde dagdienst tonen.

## Test
Publiceer `index.html` en `app.js` in GitHub Pages. Selecteer BU, MU en medewerker. Test Unavailable Times zoals voorheen. Controleer daarna het read-only roosterpaneel en de diagnose. Deel de roosterresponse voor een precieze koppeling en Work Plan-toewijzing.

Geen live Genesys-test uitgevoerd.
