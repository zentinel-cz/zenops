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
