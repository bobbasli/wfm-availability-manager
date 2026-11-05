# WFM Availability Manager v0.1.0

Eerste technische testversie voor Genesys Cloud Agent Unavailable Times, geschikt voor hosting op GitHub Pages en opname als Genesys Cloud Client Application.

## Installatie
1. Upload `index.html`, `style.css` en `app.js` naar de root van een GitHub Pages repository (of andere HTTPS-webhost).
2. Maak in Genesys Cloud Admin > Integrations > OAuth een OAuth-client van het type **Authorization Code Grant (PKCE)** aan. Gebruik een publieke browserclient zonder client secret.
3. Voeg als **Authorized redirect URI** de volledige URL van `index.html` toe, bijvoorbeeld `https://account.github.io/wfm-availability-manager/`. Let op: een exacte match inclusief slash is vereist.
4. Open de app, voer de OAuth Client ID in en klik op Aanmelden.
5. Maak een Genesys Cloud Client Application aan en verwijs naar dezelfde HTTPS-URL. Test de applicatie ook in een afzonderlijk tabblad.

Je kunt optioneel `?clientId=JOUW_CLIENT_ID&region=mypurecloud.de` meegeven. Deze parameters zijn configuratie, geen geheimen.

## Gebruik
- Selecteer een Business Unit, daarna een Management Unit en een medewerker.
- Kies de datums en klik op **Ophalen / verversen**.
- Bekijk de ontvangen data in de resultaten en de volledige JSON onder **API-diagnose**.
- Het query-body-veld bevat een **voorlopige** aanname (`startDate`/`endDate`); pas dit aan volgens de API Explorer als Genesys een ander schema vereist.
- Om te schrijven moet je de **correcte PATCH JSON** uit de Genesys API Explorer invoeren, expliciet bevestigen en daarna op **PATCH uitvoeren** klikken.

## Beperkingen v0.1.0
- De exacte query- en PATCH-schema's zijn nog niet bevestigd. Daarom is er nog geen veilige grafische tijdvakkeneditor. Deze versie bevat een read-only resultaatweergave en een bewust handmatige JSON PATCH-testfunctie.
- De API-structuur van medewerkerslijsten en de vereiste OAuth-rechten moeten worden getest in de doelorganisatie.
- API-rechten, divisietoegang en de WFM-instelling Agent Availability bepalen wat zichtbaar en wijzigbaar is.
- OAuth access token wordt uitsluitend in `sessionStorage` van de browser bewaard. Gebruik HTTPS en geen gedeelde computer.
- De applicatie voert geen automatische mutaties uit. De gebruiker moet de JSON invoeren en de wijziging bevestigen.
- Wijzigingen in Unavailable Times wijzigen niet automatisch gepubliceerde roosters.

## API-endpoints
- `GET /api/v2/workforcemanagement/businessunits`
- `GET /api/v2/workforcemanagement/businessunits/{businessUnitId}/managementunits`
- `GET /api/v2/workforcemanagement/managementunits/{managementUnitId}/users`
- `POST /api/v2/workforcemanagement/agents/{agentId}/unavailabletimes/query`
- `PATCH /api/v2/workforcemanagement/agents/{agentId}/unavailabletimes`

## Troubleshooting
- **401**: sessie/token ongeldig; opnieuw aanmelden.
- **403**: controleer rollen, WFM-permissies en divisietoegang.
- **400**: controleer de exacte request body met Genesys API Explorer.
- **404**: controleer agent ID, endpoint en WFM-toegang.
- **Geen medewerkers**: controleer de Management Unit en toegangsrechten; inspecteer API-diagnose.
- **OAuth redirect mismatch**: zorg dat de redirect URI exact overeenkomt met de geregistreerde URI.

## Volgende stap
Lever een succesvolle voorbeeldresponse van de POST-query en de JSON-requestbody van PATCH aan (zonder persoonlijke gegevens). Dan kan v0.2.0 een visuele dag/weekeditor krijgen die de juiste velden behoudt.
