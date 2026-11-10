WFM Availability Manager v0.1.9.6

Nieuw: tabblad Capaciteit & beschikbaarheid. Selecteer BU en MU, kies een week en klik Overzicht ophalen.

De applicatie leest alle MU-medewerkers, Work Plans en Unavailable Times. Work Plan-koppeling wordt alleen getoond als deze via de agentdetail-API of expliciete plan-associatie is vast te stellen. Bij ontbrekende koppeling geen verzonnen cijfers. Flexibele betaalde uren worden als minimum–maximum weergegeven; de percentages zijn overeenkomstige bandbreedtes. Overlappende niet-beschikbare tijdvakken worden niet dubbel geteld. Tijdelijke workplan-rotaties/overrides nog niet ondersteund.

Let op: de app is een prototype; de API-response van de agentdetail-API is nog niet live gevalideerd. Het overzicht toont bij onbekende koppeling een melding in plaats van een schatting. Bestaande roostereditor ongewijzigd.

Publiceer index.html en app.js samen. OAuth redirect URI moet overeenkomen met de hosting-URL.
