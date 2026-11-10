WFM Availability Manager v0.1.9.7

Nieuwe tab Capaciteit & beschikbaarheid:
- Klantonafhankelijke marge 0-100% (standaard 25%, browser-lokaal bewaard).
- Work Plan-dienstvensters worden bepaald met vroegste/laatste start, maximale betaalde dienstlengte en expliciet onbetaalde activiteiten. Nachtdiensten over de weekgrens worden meegenomen.
- Onbeschikbaarheid wordt alleen afgetrokken voor overlap met samengevoegde dienstvensters.
- Normdekking toont een bereik bij flexibele wekelijkse betaalde uren en kan boven 100% uitkomen.
- Maximaal aantal werkdagen is zichtbaar, niet verwerkt in de uurdekking.

Beperkingen: inzetvensters zijn een theoretische bovengrens. Combinaties van diensten, rustregels, beperkingen per planningsperiode, exacte pauzeplaatsing, rotaties en tijdelijke Work Plan-toewijzingen zijn niet volledig geverifieerd. Bij niet vastgestelde toewijzing geen schijnpercentages. De app leest deze gegevens alleen; de bestaande Unavailable Times-editor blijft ongewijzigd.

Installatie: vervang index.html en app.js samen; Ctrl+Shift+R. Controleer de versie in de header.
