# Implementation Plan

## Delivery principles

- Treat the accepted business rules and ADRs as authoritative.
- Build one vertical slice at a time and keep authorization and validation
  server-side.
- Keep the application and database in an isolated Docker Compose project.
- Do not reuse the legacy ZenOps schema as the V1 schema. Preserve it only as
  a controlled migration source until a separate migration decision is made.
- Do not deploy incomplete milestones to the production domain without
  explicit approval.

## Proposed stack

- **Language:** TypeScript in a pnpm workspace.
- **Web:** React 19, Vite, Tailwind CSS and accessible headless components.
- **API:** Node.js 22 LTS with Fastify, Zod validation and generated OpenAPI.
- **Data:** PostgreSQL 16 with Drizzle ORM and versioned SQL migrations.
- **Authentication:** server-side sessions, Argon2id password hashes, secure
  HTTP-only cookies and CSRF protection.
- **Reports:** server-rendered HTML with Playwright PDF output.
- **Tests:** Vitest for domain/unit tests, API integration tests against a
  disposable PostgreSQL database, and Playwright for critical mobile flows.
- **Observability:** structured JSON logs, health/readiness endpoints and
  Docker healthchecks.

## Staged milestones

1. Workspace, CI checks, API/web shells, migrations and authentication/RBAC.
2. Users, employees, roles/permissions and projects with current leader.
3. WorkDay, WorkEntry and BreakEntry workflow with interval validation.
4. ProjectDay and dynamic work type/activity metadata.
5. Machines, attachments, MTH continuity and overlap protection.
6. Vehicles, shared trip semantics and driver-owned operational data.
7. Machine fuel and shared ProjectDay brushcutter fuel.
8. Project-based approvals, return reasons and self-approval prevention.
9. Live daily report and PDF export.
10. Monthly reports, closure/reopen workflow and audit hardening.
11. Security, backup/restore and production-readiness verification.
12. Explicitly approved production deployment through the existing Caddy.

Each milestone must include migrations, backend authorization, validation,
tests, audit implications and documentation. Deferred items in
`docs/open-questions.md` remain out of scope.

