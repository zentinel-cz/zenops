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
- Admin employee management UI with role assignment and lifecycle controls
- Admin overview of open/closed projects with close/reopen controls
- Czech V1 user guide maintained as documentation-as-code

Remaining:

- leader reassignment after the authority question is decided
- richer project detail/edit screen after its editable-field rules are decided

## Milestone 3 — WorkDay, WorkEntry and BreakEntry — core complete

Completed:

- individual WorkDay with morning/night shift and one record per employee/date
- night intervals crossing midnight
- multiple project WorkEntries and explicit BreakEntries
- seeded work types and Tree Cutting activities
- required Tree Cutting activity and `OTHER` description validation
- PostgreSQL exclusion constraints and cross-table overlap protection
- lazy OPEN monthly-period creation and closed-period protection
- draft/returned edit lock, deletion and submission workflow
- mobile-first worker dashboard forms and timeline
- integration coverage for night work, activity rules, overlap and submission

Approval/return behavior remains milestone 8 and is not silently simulated.

## Milestone 4 — ProjectDay and work metadata — complete

- unique lazy ProjectDay per project/business date
- shared weather, temperature and note
- current-Leader scope enforcement with global Admin access
- transactional audit for ProjectDay changes
- WorkEntry always references its ProjectDay
- server-owned work types and Tree Cutting activities
- responsive ProjectDay management form

## Milestone 5 — machines and attachments — complete

- generic machine/machine-type and attachment/attachment-type catalogues
- Leader/Admin catalogue creation with audit trail
- machine usage bound to an owned draft WorkEntry
- suggested start MTH from latest valid end reading
- entered start/end MTH validation and override audit
- separate fuel consumed and fuel refuelled values
- PostgreSQL exclusion constraints for concurrent physical-machine usage
- PostgreSQL exclusion constraints for concurrent attachment usage
- integration coverage for MTH continuity and attachment reuse
- responsive Leader/Admin catalogue creation UI
- worker machine/MTH/fuel/attachment form attached to a draft WorkEntry
- machine usage rendered in the WorkDay timeline
