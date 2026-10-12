#!/bin/sh
set -eu

compose_directory=${ZENOPS_COMPOSE_DIRECTORY:-/opt/zenops/app}

cd "$compose_directory"

# The migration service has its own Compose image name. It must be rebuilt
# from the same checkout as the API and web before any forward migration runs.
docker compose --profile tools --profile app build migrate api web
docker compose --profile tools run --rm migrate
docker compose --profile app up -d --no-deps api web
