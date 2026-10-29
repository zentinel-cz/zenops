# Atomic project day and fuel release

Apply forward-only migration 0022 before starting the new API. It adds
nullable clearing metadata, replaces the required-value check with a state
constraint and prevents deleting fuel history. Existing rows stay active;
IDs, values and audit history are unchanged. Deploy API and web together.

Use the standard production deployment procedure with a verified database
backup/source bundle. This change has not been deployed from this workspace.
Do not roll back the schema by deleting cleared records; restore/recovery
must retain the audit history.

Verify on an open project/month: save weather and fuel, clear both numbers,
reload, then enter zero. Check the same fuel ID, before/after audits and
daily/monthly totals. A failed fuel save must leave weather unchanged.
Older metadata-only and fuel-only clients remain supported.

## Verification completed locally

- 51 API tests, including 40 PostgreSQL integration tests, and 4 shared tests.
- API/web type checks and production builds.
- Disposable PostgreSQL 16: full migrations; audited clear/reactivation with
  the same ID, empty initial save, legacy endpoints, unchanged fuel attribution,
  role/assignment/origin checks, closed project/month, concurrent paired saves,
  daily/monthly exclusion and injected database failure with full rollback.
- Real Edge at 390px: one PUT, clear surviving reload, zero reactivation,
  retained form inputs and unchanged committed data on failure, no horizontal
  overflow. No production deployment performed.
