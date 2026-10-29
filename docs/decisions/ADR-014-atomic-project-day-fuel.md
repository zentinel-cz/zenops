# ADR-014: Atomic project day and shared fuel corrections

Status: Accepted (user decision 2026-10-29, review step 4)

Daily metadata and shared brushcutter fuel submitted from one form are one
transaction, including their before/after audits. Failure leaves both unchanged.
Current Leader and Admin retain the scope defined by ADR-010. Closed projects
and closed months are read-only.

Blank means unknown; zero means a known zero. Explicit null for both fuel
values clears the existing record without deleting its ID or history.
Migration 0022 adds paired clearing timestamp/actor columns and constrains
cleared records to null values. A delete guard preserves fuel history.
Clearing is audited as PROJECT_FUEL_CLEARED, including original values.
Cleared records remain readable with clearing metadata but are excluded from
daily/PDF and monthly fuel reports. New numbers reactivate the same row.

An empty initial fuel submission creates no fuel row. A note-only initial
submission fails rather than losing the note. Unchanged fuel is not rewritten
or attributed to the editor when only daily metadata changes.

The day endpoint accepts optional nested fuel. Omission preserves existing
fuel for older metadata-only clients. The existing fuel endpoint shares the
same save service and retains metadata. Both numeric fields must explicitly
be null to request clearing. Project-row locking serializes writers with
leader handover; reads return metadata and fuel from one SQL snapshot.
