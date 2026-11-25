# ADR-022: Admin-designated brushcutter fuel recorder

Status: Accepted (user request 2026-11-25)

Admin selects at most one active Worker account company-wide, or removes the
assignment. This replaces Worker self-claiming in the fuel specification and
Leader writes in ADR-010/014. Admin retains corrective write access. Leader
retains scoped read access and daily metadata editing, without fuel writes.

The designated Worker reads and edits only shared BRUSHCUTTER fuel for open
projects, selecting project and date. This does not grant access to project
weather, internal notes, employee work or reports. No own WorkDay is required.
All other Workers and Accountant are denied. Every request checks current
assignment and active Worker status; reassignment revokes access immediately.

Assignment has an independent optimistic version and before/after audit with
reason. Fuel writes lock the assignment before the project, serializing writes
with reassignment. Project/day/category uniqueness, audit, recorder attribution,
blank versus zero, non-destructive clearing, and project/month locks remain.
Assignment does not rewrite prior recorded_by attribution or reports.
