# Projects

## Creation

Admin and Leader may create projects.

## Fields

-   internal number/code
-   name
-   location
-   BESIP boolean
-   exactly one current Leader
-   start date
-   optional end date
-   status
-   note

Customer, contract and invoicing data are outside V1 scope.

## Status

V1 statuses: - `OPEN` - `CLOSED`

All workers can select all OPEN projects. CLOSED projects are hidden
from normal worker selection and reject new WorkEntries.

Admin closes projects and may reopen them. Close/reopen actions are
audited.

If a project is closed while an employee already has an existing draft
entry for it, the existing entry may be completed/submitted; new entries
may not be created.

## ProjectDay

Project-day information is recorded once per project/day rather than
duplicated by employees: - date - weather - temperature - note

ProjectDay creation must be resilient. Do not rely exclusively on a
midnight job; use idempotent creation/lazy fallback.

## Leader replacement (ADR-010)

Only Admin can replace the Leader, with a reason and retained assignment history. The new active Leader inherits access to the whole project history and pending work. The former Leader loses scoped access immediately on subsequent requests. Closed projects can also be handed over.

## Project operational day (ADR-021)

Admin and the current Leader can open a project's day, including draft work,
workers, all assigned machines and per-machine attachments/notes. Only actual
WorkEntries establish membership; no project is inferred from an empty day.
The default date is today and closed-project history remains accessible.
Whole-WorkDay state and other-project records are not exposed.
