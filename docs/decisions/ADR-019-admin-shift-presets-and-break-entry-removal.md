# ADR-019: Admin-managed shift presets and removal of new break entry

Status: Accepted — explicit user decision 2026-11-25

The user delegates actual shift hours to Admin configuration. Add AFTERNOON
without renaming or rewriting historical NIGHT shifts. Admin configures an
optional start/end pair for each of MORNING, AFTERNOON and NIGHT in Nastavení.
No company hours are invented: initial pairs are empty. Both values must be
empty or valid distinct HH:mm times. An end before start means the next
calendar day. A change requires a reason, serializes through one settings row,
checks its version and writes a before/after audit in the same transaction.
Only Admin changes settings; Worker may read the three pairs for own entry.
Leader and Accountant gain no settings access.

Presets suggest times only; they create no work or attendance and do not alter
existing entries. Worker may edit actual times. The first new entry suggests the
selected shift's pair, later entries start at the latest work end. Without a
configured pair, inputs suggest the current Prague clock on the selected date.
Vehicle times independently suggest the current clock, not a whole work shift.
DST ambiguity continues to require explicit selection (ADR-011).

Remove the break creation form/action from Moje směna. Existing break records,
read/correction compatibility and database overlap guards are preserved; this
is not a deletion of historical intervals or an automatic payroll deduction.
New work hours continue to sum actual WorkEntry intervals with no invented
break length, no second subtraction of breaks, and no automatic addition of
vehicle trips. Historical breaks are labelled as such in the timeline/reports.

Migration 0026 extends the shift constraint and creates versioned settings,
three empty preset pairs and the settings.manage permission for Admin.
