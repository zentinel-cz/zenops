# Monthly closure blocker overview

Deploy API and web together through the existing GitHub/server automation.
No new migration is required. Check actual source/runtime versions after
the automation's two-minute polling interval before considering a manual
deployment.

The existing Admin-only period endpoint returns counts and explanatory
blockers from one SQL snapshot. The unresolved criterion is identical to the
closure guard: WorkDays outside APPROVED/CANCELLED. Details include only
unapproved entries, their projects, current Leaders, state and latest return
reason when returned. Inactive/changed Worker or Leader accounts are
identified for Admin review. Missing dates do not generate artificial days.

The UI opens a day by UUID and business date through the Admin record list,
not by a potentially duplicated name. The original month is preserved for
return navigation and its status is refreshed. Cancellation continues
through the existing reason-bearing form; eligibility excludes breaks and
driver-owned trips. Changing filters or using the record sidebar clears the
focused selection. Admin permissions remain required on both endpoints.

Closing still locks/rechecks the period on the server. A stale overview
cannot bypass new blockers; HTTP 409 refreshes the list, and manual refresh
is also available. Date changes hide mismatched report/period data.

## Verification

- All 65 API tests passed (including 54 PostgreSQL integration tests), along
  with all 4 shared contract tests. API/web type checks and production builds
  passed.
- A real browser against the built application and disposable PostgreSQL
  verified search, mixed Leaders and return reasons, exact targeting despite
  duplicate employee names, retained month navigation, audited cancellation,
  refresh, stale-close rejection, successful closure and ignoring delayed
  responses for previously selected months. Layouts passed at 320, 390, 768
  and 1440 pixels.
- PostgreSQL integration covers mixed project/Leader days, all blocking
  states, approved/cancelled exclusions, empty/break-only/trip-only days,
  exact targeting, role/Origin safeguards inherited by existing mutations,
  unavailable account guidance, absent-month read without creation, stale
  closure rejection and consistent counts during concurrent cancellation.
- User-visible controls and retained closure rules are documented in the
  user guide in the same change.
