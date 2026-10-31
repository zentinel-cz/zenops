# ADR-010: Admin handover and current-leader access

Status: Accepted (user decision 2026-10-27)

Only Admin may replace a project's current Leader, with a mandatory reason.
The replacement must be an active account with the Leader role. This applies
also to closed projects. Assignment history, effective timestamps and actor
are retained; historical approvals keep their original author and timestamp.
The new Leader gains the project's history and pending approvals. The former
Leader loses project-scoped access. Removing the Leader role also removes that
access; current role and assignment, not historical authorship, authorize reads.

The current Leader may correct approved work entries on their own projects
in an open month with a mandatory reason and before/after audit. Moving an
approved entry to a different project remains an Admin correction. Breaks,
shared trips and machine-meter corrections remain Admin-only.

Admin sees all project day metadata and shared fuel. Leader sees only currently
assigned projects, including closed-project history. Worker can select every
open project and read own work history, but not shared project notes or fuel.
Accountant remains limited to profiles and issued items.

This supersedes the immutable-leader portions of ADR-002, docs/03-projects.md,
and the prior implementation decision implemented in migration 0012. That
migration stays unchanged; the new protection is introduced forward-only.

ADR-017 later permits Workers to correct only MTH on own editable
draft/returned work, with reason and audit. The remaining Admin-only
correction boundaries above continue to apply.
