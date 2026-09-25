# Implementation Status

Last updated: 2026-09-25

## Milestone 1 — foundation and authentication — complete

Completed:

- pnpm TypeScript workspace and shared contracts package
- React/Vite mobile-first login and authenticated dashboard shells
- Fastify API with structured logging, health and database readiness checks
- PostgreSQL-backed opaque sessions with SHA-256 token storage
- Argon2id password verification and secret-safe administrator bootstrap tool
- extensible role/permission schema for `ADMIN`, `LEADER` and `WORKER`
- append-only audit log database protection
- forward-only checksum-protected migration runner
- isolated API/web production images and Compose profiles
- CI typecheck, test, build and Compose validation
- real PostgreSQL integration tests for login, session lookup, revocation and RBAC
- reusable backend authentication and permission guards

Verified:

- all workspace typechecks, unit/integration tests and production builds pass
- both SQL migrations apply and a repeated run safely skips them
- API `/health` and `/ready` pass from an isolated non-public smoke container
- database has no seeded/default account
- application services are not running in production

Deployment gate: the first administrator will be created only during an
explicitly approved deployment. This is not seeded into source or migrations.

## Milestone 2 — master data and projects — in progress

Completed:

- projects schema with normalized unique code and lifecycle constraints
- exactly one current leader plus effective-dated leader history
- permission-protected API to list open projects
- Leader/Admin project creation with active-Leader validation
- transactional project, leader-history and audit creation
- project creation/listing integration coverage
- authenticated dashboard displays live open projects
- Admin employee/account creation with explicit role assignment
- audited employee deactivation/reactivation without hard deletion
- active Leader lookup for project creation
- Admin-only audited project close/reopen workflow
- Leader/Admin project creation form in the dashboard

Remaining:

- employee management UI for Admin
- leader reassignment after the authority question is decided
- project detail, closed-project overview and management controls
