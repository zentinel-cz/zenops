# Development and Milestone 1 Operations

## Local checks

```bash
pnpm install --frozen-lockfile
pnpm check
docker compose --profile tools --profile app config --quiet
```

The default Compose invocation starts only PostgreSQL. Application services
are behind the `app` profile, while one-shot migrations use the `tools`
profile. This prevents incomplete application code from being exposed by
accident.

## Database migrations

```bash
docker compose --profile tools build migrate
docker compose --profile tools run --rm migrate
```

Migrations are forward-only and checksum protected. Applied SQL must never be
edited; add a new numbered migration instead. Database credentials are read
through the Compose secret and are never stored in Git.

## First administrator

No default credentials are seeded. Create the first administrator only during
an approved deployment using a secret-safe interactive procedure. Never put
its password in shell history or documentation.

## Production images

```bash
docker compose --profile app build api web
```

Building images does not deploy them. Starting the `app` profile and changing
or reloading Caddy require explicit production deployment approval.
