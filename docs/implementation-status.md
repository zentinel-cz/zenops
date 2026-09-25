# Implementation Status

Last updated: 2026-09-25

## Preview deployment

- approved preview is deployed at `https://zenops.zentinel.cz`
- API, web and PostgreSQL containers pass their health checks
- Caddy reaches the web container through the isolated `zenops_frontend` network
- the web port remains bound to host loopback and PostgreSQL has no published port
- HTTPS, HTTP redirect, unauthenticated 401 and the first Admin login were verified
- first Admin account exists without any credential stored in Git or documentation
- pre-deployment PostgreSQL backup was created and restore-list validation passed
- milestones 9–11 remain development work; this is an explicitly approved preview,
  not a declaration that all V1 milestones are complete

## Role dashboard and terminology revision — complete

- Admin and Leader no longer receive or pass Worker-only WorkDay permissions
- backend rejects WorkDay creation for Admin/Leader even with combined roles
- Worker dashboard is reduced to one primary daily-record action
- Worker chooses work category before seeing the order/time form
- four primary choices are Machine Mowing, Tree Cutting, Reprofiling and Manual Mowing
- user-facing `Project` terminology is renamed to Czech `Zakázka`; internal
  schema/API identifiers remain stable to avoid a risky data migration
- Admin/Leader dashboard focuses on orders, approvals and operational assets
- active machine, attachment and vehicle lists are visible with catalogue controls
- entire application uses a responsive dark operating theme

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

The first administrator was created during the explicitly approved preview
deployment. It remains outside source code and migrations.

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

Approval/return behavior is implemented in milestone 8 below.

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

## Milestone 6 — vehicles and shared trips — core complete

- separate active vehicle catalogue with unique code and registration number
- Leader/Admin vehicle creation with immutable audit event
- driver-owned trip attached to the driver's editable WorkDay
- one shared trip with explicit driver and optional passenger participants
- mileage, consumed fuel and refuelled fuel stored only once by the driver
- database exclusion constraint prevents overlapping use of one vehicle
- active-employee validation and self-passenger prevention
- responsive vehicle catalogue and driver trip form
- trip and passengers rendered in the WorkDay timeline
- PostgreSQL integration coverage for shared participants and vehicle overlap

## Milestone 7 — operational fuel — complete

- physical-machine consumption and refuelling remain stored per machine usage
- shared brushcutter fuel belongs to one ProjectDay/category, not an employee
- current project Leader/Admin can create and correct the shared record
- employee identity is retained as recorder without becoming data owner
- duplicate project/day/category records are prevented by database uniqueness
- consumed and refuelled values remain separate and non-negative
- every create/correction writes immutable before/after audit data
- responsive ProjectDay fuel form displays the single current shared record
- PostgreSQL integration coverage proves upsert uniqueness and audit history

## Milestone 8 — approval workflow — core complete

- current project Leader sees submitted work performed by other workers
- Leader approves or returns each WorkEntry independently
- returned WorkEntry requires a reason and unlocks the owning WorkDay
- already approved entries remain locked when returned work is resubmitted
- Leader's own submitted work is routed to Admin instead of self-approval
- WorkDay aggregates `SUBMITTED`, `PARTIALLY_APPROVED`, `RETURNED` and `APPROVED`
- approval decisions are append-only and mirrored into the audit trail
- responsive approval queue for Leader/Admin
- PostgreSQL integration coverage for partial approval, return and resubmission

## Milestone 9 — live daily report and PDF — complete

- live report is derived directly from current operational records
- approved and provisional work are clearly separated and totalled
- Leader scope is restricted to orders currently led by that employee
- Admin receives global daily reporting scope
- work, breaks, machines, MTH, attachments, machine fuel, vehicles, mileage,
  passengers and shared order fuel are included
- responsive dark dashboard supports date selection and operational drill-down
- professional landscape A4 PDF is rendered by Chromium through Playwright Core
- PDF endpoint uses the same backend authorization and scope as the live report
- PostgreSQL integration coverage verifies Leader scope and Worker denial

## Milestone 10 — monthly reporting and closure — complete

- monthly employee totals with morning/night shift breakdown
- monthly order hours and participating-worker counts
- machine MTH and consumed/refuelled fuel totals
- vehicle kilometre and fuel totals plus shared order fuel totals
- Leader reporting remains scoped to currently led orders; Admin is global
- Admin-only OPEN/CLOSED monthly-period controls
- unresolved WorkDays block closure with an exact count
- closed month blocks ordinary ProjectDay and shared-fuel edits
- reopening requires a recorded reason
- close/reopen actions are append-only audited
- responsive dark monthly overview and closure controls
- PostgreSQL integration coverage for totals, blocked closure, close, edit lock,
  mandatory reopen reason and audit history
