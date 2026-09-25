# ZenOps Agent Instructions

## Authority

The `/docs` directory and accepted ADRs are the source of truth for
ZenOps business behavior.

Before changing domain logic: 1. Read the relevant specification. 2.
Check accepted ADRs. 3. Preserve existing business invariants. 4. If
requirements conflict, stop implementation of the conflicting part and
document the conflict. 5. Never silently invent a business rule.

## Engineering principles

-   Mobile-first, especially for Worker workflows.
-   Keep domain logic server-side; frontend validation is supplemental.
-   PostgreSQL is the system of record.
-   Use migrations for schema changes.
-   Use transactions for multi-record operational changes.
-   Use database constraints where practical in addition to application
    validation.
-   Approved/historical operational data must be auditable.
-   Do not hard-delete historical employees, projects, machines,
    vehicles or approved operational records.
-   Secrets must live outside Git.
-   Database must not be publicly exposed.
-   RBAC must be enforced by the backend.
-   Store timestamps in a timezone-safe form and render in the
    configured business timezone.
-   A night shift may cross midnight.

## Deployment safety

ZenOps must run in its own Docker Compose project and must not modify
unrelated containers. Use the existing Caddy installation. Before
modifying Caddy: - inspect current configuration, - back it up, - add
only the ZenOps site, - validate configuration, - reload safely. Do not
deploy incomplete work to production without explicit approval.

## Product identity

The application is a Zentinel.cz product. UI should be clean, modern,
professional and intentionally designed rather than a generic admin
template.

## User documentation

Every user-visible workflow change must update `docs/user-guide.md` in the
same commit. A feature is not complete when the guide describes different
roles, controls, states or behavior than the application.
