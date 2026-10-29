# Approval detail cards

Deploy the API and web together using the existing release procedure.
No new schema migration is required for this feature. The existing migration
0021 machine-summary function is used; keep the full current migration set,
including 0022 from the preceding fuel release.

The pending query scopes records to the current Leader in SQL and returns
description, work activity and all machine usages. Cards show the employee,
project, activity, Prague interval and elapsed duration. Expandable details
keep each machine's readings, fuel and attachments together. Missing values
are explicit and zero remains visible. Search covers these details.

Returning work uses a reason form on the relevant card. A failed request
preserves its reason; successful decisions remove the processed entry and
refresh the queue. Existing approval permissions and audit rules are retained.
The user guide is updated in the same change.

## Verification

- 52 API tests, including 41 PostgreSQL integration tests. The new scenario
  covers two machines, separate attachments, zero/null fuel, work activity
  and description, an entry without machines, draft exclusion, role and
  other-Leader denial, successful approval and return with the saved reason.
- API/web type checks and production builds.
- Real Edge with a disposable PostgreSQL database at 320, 390, 768 and
  1440 pixels: keyboard expansion, full description shown as text, independent
  machine readings, zero versus missing values, text/activity/attachment
  search, empty search result, work spanning midnight and after midnight
  in Prague on a device using America/Los_Angeles, no horizontal overflow.
- An injected HTTP failure preserves the return reason. Subsequent real
  return and approval persist the expected decisions and reason.

No production deployment performed.
