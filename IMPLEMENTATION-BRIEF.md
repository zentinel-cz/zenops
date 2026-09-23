# ZenOps Implementation Brief for OpenClaw

You are implementing ZenOps, a production-grade Zentinel.cz application.

## First action

Read `AGENTS.md` and all files under `/docs`. Treat accepted business
rules and ADRs as authoritative.

Before coding: 1. Inspect the server's existing Docker and Caddy
environment without destructive changes. 2. Produce a concise
architecture/implementation plan. 3. Identify contradictions or
unresolved dependencies. 4. Propose the concrete stack and database
schema. 5. Only after the specification is internally consistent,
implement V1 in staged milestones.

## Deployment

-   Isolated Docker Compose project.
-   PostgreSQL with persistent volume.
-   No public database port.
-   Production domain: `zenops.zentinel.cz`.
-   Use existing Caddy, do not install another Caddy.
-   Back up and validate Caddy config before safe reload.
-   If DNS is missing, report the exact record needed instead of working
    around DNS.
-   Keep secrets in environment/secrets, never Git.

## Quality bar

This must look and behave like a product released by Zentinel.cz: -
mobile-first worker UX, - clean Zentinel identity, - robust server-side
validation, - RBAC, - migrations, - audit trail, - healthchecks, -
structured logs, - safe error handling, - backup-aware persistent
storage, - no placeholder business logic silently promoted to
production.

## Implementation sequence

Recommended: 1. project skeleton + auth/RBAC 2. employee/project master
data 3. WorkDay/WorkEntry/Break workflow 4. ProjectDay 5.
machines/attachments/MTH conflict rules 6. vehicles 7. fuel 8.
project-based approval 9. live daily report + PDF 10. monthly reports +
closure 11. audit/security hardening 12. production deployment through
Caddy

Do not implement deferred features from `open-questions.md` unless
explicitly instructed.
