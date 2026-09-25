# ZenOps --- Business & Architecture Specification v1.0

ZenOps is a mobile-first internal operations platform by
**Zentinel.cz**.

This repository/specification is the authoritative input for
implementation. The initial product covers workforce time records,
projects, machinery, attachments, vehicles, fuel, approvals, live daily
reporting and monthly closures.

## Implementation target

-   Production domain: `zenops.zentinel.cz`
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

## Current implementation status

Milestone 1 is complete and milestone 2 is in progress. The repository contains a pnpm/TypeScript
workspace, React mobile-first web shell, Fastify API, PostgreSQL-backed opaque
sessions, Argon2id authentication, extensible RBAC, checksum-protected SQL
migrations, isolated Docker images and CI checks. The first milestone 2 slice
adds projects, current/effective-dated leaders, audited creation and a live
open-project dashboard.

The application profile is intentionally not deployed while the milestone is
incomplete. No default credentials are seeded.

Implementation and operations documents:

- `docs/architecture/implementation-plan.md`
- `docs/architecture/database-schema-v1.md`
- `docs/architecture/legacy-notes-review.md`
- `docs/operations/prebuild-readiness.md`
- `docs/operations/development.md`
- `docs/implementation-status.md`
