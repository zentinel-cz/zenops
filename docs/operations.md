# Operations

## Before upload
- ověřit volné místo na serveru
- potvrdit cílovou doménu `zenops.zentinel.cz`
- ověřit, zda DNS směřuje na Zentinel reverse proxy

## After ZIP upload
- zkontrolovat typ archivního souboru
- rozbalit do pracovní složky
- identifikovat runtime a build systém
- připravit Dockerfile nebo compose
- ověřit health, porty, logy a reverse proxy

## Deploy target
- Docker on Zentinel master
- reverse proxy through existing `zentinel-web-caddy`

## Verification checklist
- container běží
- aplikace odpovídá lokálně
- doména `zenops.zentinel.cz` vrací správný obsah přes HTTPS
- logy neobsahují fatal error
- jsou zdokumentované env proměnné a restart postup
