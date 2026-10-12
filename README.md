# ZenOps --- Business & Architecture Specification v1.0

ZenOps is a mobile-first internal operations platform by
**Zentinel.cz**.

This repository/specification is the authoritative input for
implementation. The initial product covers workforce time records,
projects, machinery, attachments, vehicles, fuel, approvals, live daily
reporting and monthly closures.

## Implementation target

-   Production domain: `zenops.zentinel.cz`
-   Authoritative repository: `https://github.com/zentinel-cz/zenops`
-   Production branch: `main`
-   Production checkout on the application server: `/opt/zenops/app`
-   Deployment: isolated Docker Compose stack
-   Reverse proxy: existing Caddy instance
-   Database: PostgreSQL
-   Mobile-first UI
-   Backend-enforced RBAC and validation
-   Auditability of operational and approved data

## Read order for an implementation agent

1.  `AGENTS.md`
2.  `docs/00-product-vision.md`
3.  `docs/10-business-rules.md`
4.  `docs/01-domain-model.md`
5.  `docs/02-workday-workflow.md`
6.  Remaining domain documents
7.  `docs/open-questions.md`
8.  `docs/architecture/*`
9.  `docs/decisions/*`

Do not invent missing business rules. Record unresolved decisions in
`docs/open-questions.md`.

## Mandatory migration, RBAC and deployment rules

These rules apply to every human developer and coding agent working on ZenOps:

1. Treat application source, migration source, the migration runtime image,
   the applied database schema and the running application images as one
   release. A feature is not complete while any one of these layers is stale.
2. Docker Compose services have separate images even when they share a
   Dockerfile. Build every executable service required by a release, including
   `migrate`, before running migrations. Use `ops/deploy-production.sh`; do not
   duplicate an incomplete deployment command on the server.
3. Give every new migration a unique, monotonically increasing filename.
   Never reuse a numeric prefix and never edit a migration already recorded in
   production. Migrations must be additive and forward-only.
4. Role and permission writes must fail closed. Resolve requested roles inside
   the same transaction, require the number of resolved and inserted roles to
   match the request exactly, and roll back the complete account mutation on a
   mismatch. An active account must never be left without exactly one role.
5. A successful HTTP response is not sufficient proof. Tests must verify the
   persisted role relation, resolved session roles and permissions, and the
   corresponding authenticated API and UI behavior.
6. Migration-backed changes require integration tests on a disposable
   PostgreSQL database with the complete ordered migration set. Before merging,
   run typecheck, relevant tests, the production build, Compose configuration
   validation and inspection of the migration image. Report skipped database
   tests explicitly; never present them as passed.
7. Before production changes, create and verify a database dump and source
   recovery artifact. After deployment verify the Git commit, runtime artifact
   hashes, ordered migration names and checksums, container health and restart
   counts, public and protected HTTP behavior, and recent logs.
8. After every RBAC deployment, query the new role and permissions, active
   accounts without a role and accounts with an invalid role count. Verify the
   real role-specific session and screen with a safe test identity, or hand an
   exact authenticated test plan to QA.
9. Update `docs/user-guide.md` in the same commit whenever roles, permissions,
   screens, forms, workflows or user-visible error behavior change.

## Current implementation status

ZenOps V1 is deployed at `https://zenops.zentinel.cz`. The implemented scope
includes authentication and RBAC, employee and project administration,
Worker-only WorkDays, work entries and breaks, machines and attachments,
vehicles and shared trips, operational fuel, per-entry approval, daily and
monthly reporting, monthly closure, audited administrative corrections,
self-service password changes, production backups and restore tooling.

The workspace uses React/Vite for the mobile-first web application, Fastify for
the API, PostgreSQL as the system of record, checksum-protected SQL migrations,
isolated Docker images and CI checks. No default credentials are seeded.

See `docs/implementation-status.md` for the detailed implemented scope and
`docs/user-guide.md` for current user-visible workflows.

Implementation and operations documents:

- `docs/architecture/implementation-plan.md`
- `docs/architecture/database-schema-v1.md`
- `docs/architecture/legacy-notes-review.md`
- `docs/operations/prebuild-readiness.md`
- `docs/operations/development.md`
- `docs/implementation-status.md`
