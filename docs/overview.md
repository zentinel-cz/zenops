# Overview

## Purpose
Repo slouží jako připravená základna pro nový software, který má běžet na `zenops.zentinel.cz`.

## Expected deployment shape
- aplikace bude dodána jako ZIP
- po převzetí se určí stack a entrypoint
- cílový způsob provozu je Docker
- publikace bude přes existující Zentinel reverse proxy / Caddy stack

## Expected analysis after upload
Po dodání ZIPu bude potřeba ověřit:
- typ aplikace
- build/runtime závislosti
- port, health endpoint, env proměnné
- potřebu databáze, volumes, workerů, cronů
- bezpečnostní a provozní nároky

## Infrastructure context
- GitLab: projektová dokumentace a zdroj pravdy
- Docker: cílové spuštění
- Caddy: publikace na `zenops.zentinel.cz`
- host: Zentinel master server
