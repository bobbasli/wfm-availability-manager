# WFM Availability Manager v0.1.9.5.2

Herstelrelease op basis van v0.1.9.5.

- Activity Codes worden alleen verwerkt als de API daadwerkelijk een array met objecten teruggeeft.
- Onverwachte Activity Codes-response geeft een waarschuwing in plaats van een vastlopende weergave.
- Kleurvelden die objecten zijn worden veilig uitgelezen.
- Rooster- en activiteitarrays worden defensief verwerkt.
- De bestaande Unavailable Times-editor, gepubliceerde roosters en Tailwind-header blijven behouden.
- Cache-busting app.js?v=0.1.9.5.2.

Upload index.html en app.js samen naar GitHub Pages. Bij een blijvende blanco pagina graag de exacte eerste rode fout uit de browserconsole (F12 > Console) delen.

Fix: Activity Codes worden altijd naar een array genormaliseerd; geen .map() op een object.
