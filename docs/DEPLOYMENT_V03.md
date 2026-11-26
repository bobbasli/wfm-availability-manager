# Versie 0.3 deployen en de bestaande versie terugzetten

## Wat staat waar?

De broncode staat in **bobbasli/wfm-availability-manager**, branch `feature/v0.3-typescript`, versie **0.3.0**. De ontwikkel-PR gaat naar `feature/capacity-v021`, niet naar productie-main.

De bestaande app staat op **https://bobbasli.github.io/wfm-availability-manager-test/**. Voor die repository is een afzonderlijke release-PR naar `main` voorbereid. Alleen het mergen van die test-PR publiceert de testsite. Dit is dus iets anders dan de ontwikkel-PR in de bronrepository. De bestaande productie-/bron-main wordt niet gewijzigd.

GitHub Release **v0.3.0** bevat de broncode plus `wfm-v0.3.0-web.zip` (klaar voor een eigen webserver) en `wfm-v0.2.1-rollback-web.zip` (herstelbuild). De release is als prerelease gemarkeerd totdat je de echte Genesys-flow hebt getest.

Het herstelpunt **backup/pre-v0.3.0** verwijst in beide repositories naar commit `57541d92b6cad1e37c03a5463a59446083f57bb2`, de bestaande testversie vóór deze wijziging. Release-tags worden niet verplaatst.

## Deployen via GitHub, zonder lokale build

1. Open de release-PR **in `bobbasli/wfm-availability-manager-test`**. Controleer dat de doelbranch `main` is en alle checks groen zijn.
2. Kies **Create a merge commit** bij de merge-opties en daarna **Merge pull request** → **Confirm merge**. Gebruik bij voorkeur deze optie zodat GitHub de wijziging gemakkelijk kan terugdraaien.
3. Open **Actions → Build and deploy WFM Availability Manager**. Wacht op de run met event **push** op `main`; zowel **build** als **deploy** moeten groen zijn. Een groene PR-run met overgeslagen deploy publiceert nog niets.
4. Open https://bobbasli.github.io/wfm-availability-manager-test/ en vernieuw met **Ctrl+F5**. In kop en voettekst moet **v0.3.0** staan. Houd bij ingesloten Genesys-weergave rekening met de browsercache; open eventueel eerst de URL in een nieuw tabblad.
5. De URL blijft hetzelfde. Als Genesys de test-URL al gebruikt, hoef je de Client App-URL of OAuth redirect-URI niet te veranderen. Bij een andere host moet de redirect-URI exact overeenkomen, inclusief `/`; verwijder het werkende oude adres niet.
6. Test de onderstaande punten voordat je de versie verder uitrolt.

**Niet nodig:** bestanden handmatig downloaden/uploaden voor GitHub Pages. `Re-run all jobs` op een oude PR-run is ook geen deployment.

## Test in Genesys

- Kop/voettekst tonen v0.3.0; licht/donker-thema en beide tabs werken.
- Aanmelden/afmelden, juiste regio/client en BU → MU → medewerker.
- Unavailable Times bekijken; toevoegen/wijzigen/verwijderen met een testmedewerker en expliciete bevestiging.
- Wissel snel van medewerker en datum: geen oude gegevens of editor bij de verkeerde medewerker.
- Gepubliceerde roosters en activiteiten blijven alleen-lezen; rooster-/agenthistorie blijven gescheiden.
- Eigen Work Plans per medewerker/week, nachtdiensten/weekgrenzen en overlap.
- Marge 0/25/50% wijzigt direct zonder nieuwe API-ophaling.
- Referentie zonder onbeschikbaarheid: 40 uur betaald, vijf vensters 08:00–17:30 → 47,5 uur ruimte → 95% bij 25% marge (118,8% afgerond bij 0%).

## Terugzetten via GitHub

1. Open de **gemergede release-PR in de testrepository** en klik onderaan op **Revert**.
2. Laat GitHub een nieuwe herstel-PR naar `main` aanmaken. Controleer dat die de 0.3-wijzigingen terugdraait; merge de herstel-PR.
3. Wacht in **Actions** opnieuw op een groene **push**-run met geslaagde build én deploy. Vernieuw de app met Ctrl+F5. De kop moet weer **v0.2.1** tonen.

Dit herstelt de applicatiecode. Het draait geen bewust opgeslagen Unavailable Times in Genesys terug; die staan in Genesys en zijn onafhankelijk van de gehoste versie. Overschrijf geen inmiddels door andere mensen gemaakte codewijzigingen: bij conflicten blijft de hersteltag de bron voor een gerichte herstel-PR.

Is de Revert-knop niet beschikbaar? Gebruik de releasebuild `wfm-v0.2.1-rollback-web.zip` voor eigen hosting, of maak een herstelbranch op basis van `backup/pre-v0.3.0` en laat de code via een PR terugzetten. GitHub **Code → tag kiezen** verandert op zichzelf de live site niet. Ook de oorspronkelijke bron-main hoeft voor herstel niet gewijzigd te worden.

## Eigen webserver

Download uitsluitend **wfm-v0.3.0-web.zip**, pak uit en zet de inhoud (`index.html` en `assets/`) in de map van je test-URL. De ZIP bevat een lokaal geteste productiebuild; geen npm op de webserver nodig. Maak vooraf een kopie van de huidige webmap. Gebruik HTTPS en registreer de exacte URL als OAuth redirect-URI in Genesys.

Terugzetten: herstel de oude webmap of pak `wfm-v0.2.1-rollback-web.zip` uit naar dezelfde webmap. Verwijder oude HTML niet voordat je een herstelkopie hebt. Zorg dat `index.html` opnieuw wordt gevalideerd door de browser/proxy zodat de nieuwe assetverwijzingen worden geladen. Gebruik bij voorkeur een aparte testmap en pas de Genesys Client App-URL pas aan nadat die werkt.

## Herkomst van de builds

Beide web-ZIP's worden gemaakt met `npm ci` en `npm run build` vanuit respectievelijk de releasecommit en het vastgelegde herstelpunt, met Node.js 22. Er zitten geen tenantdata, OAuth-tokens of secrets in. PKCE, scopes en live API-contracten moeten altijd in de daadwerkelijke Genesys-omgeving worden getest.
