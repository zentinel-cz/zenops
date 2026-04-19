# ZenOps Web Deployment

## Purpose
Tento projekt je připravené pracovní místo pro nasazení aplikace na `zenops.zentinel.cz`.

Bude sloužit jako:
- příjem místa pro ZIP s dodaným softwarem
- dokumentační bod pro analýzu aplikace
- základ pro Docker deploy
- provozní reference pro další změny

## Current status
- GitLab projekt založen
- základní dokumentace připravena
- čeká se na nahrání ZIP balíku aplikace

## Planned workflow
1. Robo dodá ZIP aplikace
2. ZIP se uloží do `inbox/`
3. proběhne rozbalení a technická analýza
4. připraví se Docker image / compose / runtime config
5. doplní se reverse proxy pro `zenops.zentinel.cz`
6. proběhne deploy, test a ověření

## Expected runtime target
- doména: `zenops.zentinel.cz`
- deployment model: Docker service behind existing Zentinel reverse proxy
- host: Zentinel master server

## Main directories
- `inbox/` — místo pro dodané ZIPy
- `docs/` — analýza, architektura, provoz
- `deploy/` — docker / runtime deployment files
- `scripts/` — pomocné skripty pro import a kontrolu
