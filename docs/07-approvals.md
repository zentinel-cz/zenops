# Approvals

## Principle

Approval authority is derived from the Project, not from a permanent
employee-to-leader hierarchy.

Each Project has exactly one current Leader.

## States

Minimum: - `DRAFT` - `SUBMITTED` - `APPROVED` - `RETURNED`

Returned records require a reason.

The pending queue shows employee, project, work type/activity, business date,
interval and elapsed duration. Expandable details include the description
and every attached machine, with its own start/end MTH, fuel and attachments.
Missing values are distinguished from zero; entries without machines are
explicitly labelled. Machine fuel is separate from shared ProjectDay fuel.
Search includes description, activity, machines and attachments.

## Multiple projects

If an employee works on multiple projects in one WorkDay, each project's
relevant work is approved by that project's Leader.

The WorkDay becomes fully approved only after all relevant project work
is approved.

Only the current Leader currently assigned to the Project may approve or
return its submitted WorkEntries. Admin does not participate in operational
approval. Leader and Admin accounts cannot create WorkDays.

## After approval

Worker cannot freely edit approved data.

Leader may correct approved data only within their own project and while
the month is open. Admin may perform administrative corrections.
Sensitive corrections are audited.

Historical approval identity/timestamp must remain intact.

ADR-010 governs Admin-only audited Leader replacement and scoped corrections. Historical approval authors remain unchanged.
