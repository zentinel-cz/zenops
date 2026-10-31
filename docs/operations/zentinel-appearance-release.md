# Zentinel appearance release — 2026-10-31

Deploy through the existing GitHub automation. This change updates only
web assets and documentation; it requires no database migration or Caddy
configuration change. Verify the running web asset hashes after deployment,
not only the server checkout revision.

The palette is taken from https://zentinel.cz. Shared CSS tokens replace
the former green branding throughout sign-in, Worker, Leader, Admin and
Accountant. Surface, control, dialog and navigation styles are shared.
Approved, waiting, returned and error states retain distinct semantic colors
and text labels. The temporary monogram is centralized in BrandMark.tsx
until the user supplies the final logo.

## Verification

- Web TypeScript check and production Vite build passed.
- 65 API tests (including 54 PostgreSQL integration tests) and 4 shared
  contract tests passed.
- Real-browser checks against the built application and isolated PostgreSQL
  passed 231 screen/viewport combinations, including sign-in, all four roles,
  every navigation section, employee and asset creation forms, Worker entry
  and break forms, profile/detail screens and account forms.
- Viewport widths: 320, 360, 390, 480, 600, 768, 820, 1024, 1280, 1440,
  1920 and 2560px. No page overflow or browser errors were found in the
  final run. Computable solid-background text contrast checks passed;
  gradient surfaces and representative mobile/desktop screenshots were
  inspected separately. This is not a claim of a full accessibility audit.
- Existing browser regression scenarios passed for approval/return,
  machine/trip correction dialogs, driver/passenger fuel, Worker MTH
  correction and monthly closure, including failure handling and keyboard
  cancellation. Their mobile/desktop layout checks also passed.
- User-facing appearance and navigation guidance is updated in user-guide.md.
