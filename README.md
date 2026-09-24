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

The repository currently contains the authoritative specification and
pre-build infrastructure only. PostgreSQL can be prepared with `compose.yaml`,
but no frontend, backend, schema migration or production application has been
implemented yet.

Preparation documents:

- `docs/architecture/implementation-plan.md`
- `docs/architecture/database-schema-v1.md`
- `docs/architecture/legacy-notes-review.md`
- `docs/operations/prebuild-readiness.md`
