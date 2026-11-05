# WFM Availability Manager v0.1.5

Vue 3 + Tailwind CSS, direct te publiceren op GitHub Pages.

## Nieuw
- Automatisch ophalen bij keuze medewerker en datumwijziging.
- Correct ISO-8601-queryformaat.
- Grafische weergave van `timeSpan.startDate` + `lengthMinutes` in Europe/Amsterdam.
- Splitsen over lokale daggrenzen en zomer-/wintertijd.
- Klikbare rode tijdvakken en concept-bewerkdialoog.
- Toevoegen als concept, met lokale validatie.

## Veiligheidsgrens
De grafische editor schrijft **nog niets weg**: PATCH request body voor toevoegen, wijzigen en verwijderen is nog niet bevestigd. De bestaande handmatige PATCH-diagnose is behouden, uitsluitend voor deskundige testgebruikers.

## Installatie
Upload `index.html` en `app.js` naar de root van je GitHub Pages-repository. OAuth Client ID en regio blijven in sessionStorage van dezelfde browser/tab staan. Gebruik de bestaande OAuth-configuratie.

## Opmerking
Vue 3 en Tailwind worden in deze prototypeversie via CDN geladen. Tailwind CDN is niet geschikt voor definitieve productie.
