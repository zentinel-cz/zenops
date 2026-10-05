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
