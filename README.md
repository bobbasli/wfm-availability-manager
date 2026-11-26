# WFM v0.3.0 — webbuilds

Deze aparte downloadbranch bevat uitsluitend geteste webbuilds, niet de ontwikkelbroncode.

- Nieuwe bron: tag v0.3.0 / commit ccb4821 in bobbasli/wfm-availability-manager.
- Herstelbron: tag backup/pre-v0.3.0 / commit 57541d92b6cad1e37c03a5463a59446083f57bb2.
- Beide builds: Node.js 22, npm ci, npm run build.
- ZIP-inhoud: index.html en assets/. Geen tokens of tenantdata.
- SHA256SUMS.txt bevat de controlesommen.

Gebruik wfm-v0.3.0-web.zip voor een eigen testwebserver, wfm-v0.2.1-rollback-web.zip voor terugzetten. Voor GitHub Pages gebruik je de release-PR in de testrepository; deze downloadbranch publiceert niets.

Deploy-/herstelhandleiding: https://github.com/bobbasli/wfm-availability-manager/blob/v0.3.0/docs/DEPLOYMENT_V03.md.

De releasebeschrijving linkt naar deze bestanden omdat uploads.github.com in de cloudomgeving niet is toegestaan. Hierdoor is geen wijziging van de omgevingsrechten nodig.
