# Report verification — 2026-10-28

Daily PDF failed in the deployed read-only API container: Chromium Crashpad
could not initialize its database under the inherited HOME. The renderer now
uses a per-request temporary HOME and XDG directories, and removes them after
success or failure. The runtime image includes Liberation fonts.

No schema change or migration is required. Deploying this fix requires rebuilding
the API runtime image (including its OS packages) and the web image.

Verification used /opt/zenops/reviews/reports-20261028 on the test server and
an isolated Compose project zenops-report-check with disposable zenops_test DB.
The existing ZenOps database was not used by these checks.

- API integration suite: 32 passed, none skipped; daily/monthly data and scope,
  denied anonymous/Worker/Accountant reads, invalid dates/months, empty data,
  project handover, machine/vehicle/fuel totals and month closure checks.
- Runtime image under read-only filesystem, tmpfs and no-new-privileges:
  populated and empty PDF downloads, 10-page Czech report, escaped HTML,
  download headers, controlled browser failure and temporary-directory cleanup.
- Browser check against the built frontend and actual API on the disposable DB:
  download completed with expected filename; generation error displayed;
  daily and monthly views had no horizontal overflow at 430px width.
- Visual inspection: populated PDF and all ten pages of the long PDF.
- TypeScript checks for API/web and web production build passed.

Runtime regression script: ops/check-report-runtime.mjs. Mount it into the API
runtime at /app/apps/api/check-report-runtime.mjs and run it there with
TEST_DATABASE_URL pointing only to zenops_test after running the integration
suite to create fixtures. Mount a writable output directory at /tmp/report-check.
It deliberately refuses another database name. The standard integration
Compose build target does not contain Chromium; this runtime check is separate.

Monthly reporting has no PDF/XLSX export in V1. Daily PDF exports the complete
permitted day, not the frontend text-search subset. Browser verification used
Chromium; physical iPhone/Safari download behavior was not verified.
