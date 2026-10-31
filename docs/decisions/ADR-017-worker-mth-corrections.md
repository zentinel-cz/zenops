# ADR-017: Worker corrections of own machine readings

Status: Accepted (user decision 2026-10-31, review step 9)

A Worker may correct the start/end MTH of a MachineUsage on an own
DRAFT/RETURNED WorkEntry in an editable DRAFT/RETURNED WorkDay and OPEN
month. This supersedes the blanket Admin-only machine-meter restriction
in ADR-010/ADR-013 only for this narrowly scoped workflow.

Both readings must be present, non-negative and within the existing MTH
range; end cannot be below start. A reason is required. The endpoint accepts
only readings and reason, with no identity, fuel, attachment, time or state
fields. Authentication and ownership are checked on the backend, together
with both day and entry state. Approved/submitted entries remain protected
even when a returned sibling makes the day editable.

Lock order is WorkDay, WorkEntry, MachineUsage, matching Worker edits and
submission. Save and a complete before/after audit with actor and reason are
one transaction. Original suggested_start_mth, fuel, attachments and resource
intervals remain intact, as do prior approval and return decisions.
Saving MTH does not approve or resubmit work; the Worker explicitly resubmits
the returned day through the existing workflow.

Existing recorded readings can be corrected even if the machine has since
been deactivated or its current tracking flag was changed. The UI offers
the per-machine action for usages containing readings. Admin retains the
existing broader audited corrections, including approved entries. Leader
does not gain machine-meter correction permission.

No schema migration is needed; existing constraints and audit storage
support the change.
