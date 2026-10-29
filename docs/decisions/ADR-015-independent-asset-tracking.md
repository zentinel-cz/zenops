# ADR-015: Independent tracking settings for catalogue items

Status: Accepted (user decision 2026-10-29, review step 7)

Creating or editing a machine's MTH setting, or an attachment's tracking
setting, applies only to the selected catalogue item. A shared type name
must not cause an edit to change another item or an initial value to be
silently ignored. Admin and Leader retain catalogue management permissions;
editing still requires a reason and a before/after audit.

Keep Machine/MachineType and Attachment/AttachmentType. Type rows become
immutable name/setting variants, uniquely identified by (name, tracks_mth)
or (name, uniquely_tracked). Saving resolves or creates the requested variant
and assigns only the selected item's foreign key. Concurrent requests reuse
the same variant without modifying its setting. A database trigger rejects
in-place type redefinitions. Audit snapshots include type identity, name
and tracking value on both creation and editing.

Migration 0023 changes constraints and adds protection without rewriting
existing type rows, item assignments, usage readings, approvals or audit
history. It cannot infer or reverse unintended changes made before this fix.
Existing catalogue values remain the migration baseline.

This change preserves current physical-resource occupancy protection.
The separate question of shared/non-unique attachment occupancy is outside
this decision; turning off the marker does not enable overlapping usage of
the same registered attachment. Existing historical readings remain readable
and reported even when current MTH tracking is turned off.
