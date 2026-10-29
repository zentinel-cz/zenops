# Operational correction forms and OTHER work

Deploy API and web together with the standard release procedure and current
migration set. This feature requires no additional migration. No production
deployment has been performed from this workspace.

Admin uses a prefilled dialog instead of successive prompts to correct
each MachineUsage's MTH, fuel and attachments, or a driver's trip times,
odometer readings, fuel, passengers and note. Identity remains fixed to the
selected machine/vehicle and driver. Every save requires a reason and uses
the existing transactional correction endpoints and before/after audits.
Leader does not gain these correction permissions.

The Admin-only record-options endpoint returns attachment and Employee
identities, including inactive historical records and profiles without a
user account. Driver is excluded from passenger selection. The frontend
waits for complete options before enabling save and supports retry on load
failure; a failed save preserves entered values. Blank fuel means null and
zero remains zero. Escape/Cancel close without saving. The form code loads
only when an Admin opens a correction.

Worker's work-type picker now includes OTHER; existing server validation
requires a description with more than whitespace. The guide documents the
controls, required reason, historical options and open-month restriction.

## Local verification

- 53 API tests, including 42 PostgreSQL integration tests, and 4 shared tests; the new test
  covers Admin-only option access and inactive identities without accounts.
- API/web type checks and production builds.
- Real Edge with disposable PostgreSQL: Worker selects OTHER, native blank
  validation and server whitespace rejection, then a successful entry.
- Machine form saves MTH, zero fuel, tanked fuel and changed attachments with
  before/after audit; another machine on the entry remains unchanged.
- Trip form preserves the original inactive passenger, excludes the driver,
  permits selection of the Admin as passenger, updates passengers/note/fuel
  and verifies audit. Blank fuel and note save as null.
- Options-load failure/retry, required correction reason, invalid odometer
  range, failed-save input retention, Escape cancellation and server rejection
  in a closed month with unchanged database values.
- Layout checked at 320, 390, 768 and 1440 pixels; no page or dialog horizontal
  overflow. Prague input is correct on an America/Los_Angeles device.
