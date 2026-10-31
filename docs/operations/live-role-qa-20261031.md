# Live role QA — 2026-10-31

The user authorized sign-in with supplied accounts for all four roles and
creation of clearly labelled production test records. Credentials were used
only for sign-in and are not included in this repository or this report.

## Production checks

- Worker, Leader, Admin and Accountant sign-in and sign-out succeeded.
  An initially incorrect Worker password was corrected by the user; this
  was not an authentication defect.
- Created project `QA-20261031`, machine `QA-MTH-20261031`, vehicle
  `QA-CAR-20261031` and a clearly labelled test equipment catalog item.
- Operational records use 2099-01-15, outside the current reporting period.
  No existing production operational records were corrected or deleted.
- Worker created one hour of work, attached the machine, recorded its MTH
  and fuel, added a break and a ten-kilometre driver-owned trip with one
  passenger. Passenger mode exposed no mileage or fuel inputs.
- An overlapping break was rejected with an explanatory error; an adjacent
  09:00–09:15 break was accepted without changing the 08:00–09:00 work.
- Leader inspected the description and machine details, returned the work
  with a reason, then received the Worker's resubmission. Worker corrected
  MTH from 100–101 to 100–100.50 with a reason; fuel remained unchanged.
  Leader approved the corrected work.
- Admin saw the submitted day as a closure blocker and opened the exact
  record with return navigation preserving January 2099. After approval,
  blockers cleared. Closure, reason-bearing reopening and closure again
  succeeded for that test month only.
- Final January 2099 totals: 60 approved work minutes, 0.50 machine MTH,
  0.50 litres machine fuel, 10 km and 0.75 litres vehicle fuel, plus 0.25
  litres of project-shared fuel. Each trip/fuel quantity appeared once.
- Accountant issued two test equipment units and recorded two partial
  returns of one unit each. Outstanding quantity became zero.
- Account search, profile/detail navigation and actual daily PDF download
  succeeded. Mobile and desktop layouts were inspected.

## Findings and changes

1. Compact Accountant navigation lost its accessible button name when its
   visible label was hidden. Added an explicit label and tooltip.
2. Admin record loading briefly claimed the selected record was unavailable.
   Added explicit loading/success/error states and ignored stale failures.
3. Accountant lists briefly appeared empty during initial loading. Added
   explicit loading/error states and a retry control.
4. New vehicle creation incorrectly said an existing vehicle was being
   edited. Corrected the creation hint.
5. The browser-native catalog-state prompt failed in the live test browser.
   Replaced it with an in-app reason-bearing form, retaining the existing
   backend permission, validation and audit behavior. Failed saves retain
   the reason; cancellation does not submit; changing target resets it.

## Release checks

Web TypeScript and production build passed. All 65 API tests (including 54
PostgreSQL integration tests) and all 4 shared contract tests passed against
isolated data. A separate local frontend fixture verified initial list
failure/retry, slow-loading feedback, catalog mutation failure with retained
reason, successful retry without a stale error, cancellation, and a named
navigation button in the compact sidebar. The fixture contains no live data
or production credentials. Production mutations are tested against the real
backend separately from this controlled failure fixture.

No migration is required. Deliver through GitHub automation, verify running
asset hashes and then repeat the new catalog form against production. Test
records remain auditable; use existing deactivation/closure controls for
catalog assets and the QA project rather than deleting their history.

## Post-deployment verification

Release `a31e131` was deployed by the server automation. Running web asset
hashes match the locally verified production build; API health/readiness
passed. The new catalog form successfully deactivated the QA equipment
under the actual Accountant account. Worker profile history shows both
returns and zero outstanding units. Database read-back confirms the QA
project is CLOSED, test WorkDay APPROVED and January 2099 CLOSED. The QA
machine is inactive; its before/after change and MTH correction are audited.

The first machine deactivation attempt from the old browser page showed a
generic save error; no corresponding PATCH reached the API. Reloading the
deployed app and repeating that operation succeeded. This transient failure
does not establish a backend machine-edit defect.

The attempted QA vehicle cleanup was not executed because the computer-use
automatic approval review failed with a technical Bad Request error. No
bypass was attempted. `QA-CAR-20261031` remains active pending user guidance;
its historical test trip remains intact. None of the supplied user accounts
was disabled or had its password changed.
