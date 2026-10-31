# Official ZenOps logo — 2026-10-31

User supplied ZenOps.png and authorized cropping and deployment. Derived
local assets replace the temporary monogram throughout sign-in and all four
role workspaces, including mobile headers where the sidebar is hidden.
The full logo is used at sign-in and in README; compact symbols are used
in navigation, favicons, the Apple touch icon and web manifest. Daily PDFs
embed a small PNG directly, with no external image fetch during rendering.
The original user file is untouched. Crop bounds and asset locations are
documented in architecture/visual-identity.md.

Verification: web/API TypeScript checks and production builds passed, all
65 API tests passed, and the built frontend was checked across sign-in and
all four roles at 320/390/768/1024/1440px. All 25 combinations showed a loaded,
undistorted logo without page overflow. Actual PDF generation produced one
page with one embedded image; its Poppler-rendered output was inspected.
The web public assets are bundled locally. Permissions and domain behavior
are unchanged; no migration is required. Deploy API and web through the
existing GitHub automation and verify runtime assets before reporting success.

Production verification caught that the web Dockerfile previously copied
only src, omitting the new public directory. The build now explicitly copies
apps/web/public, so logo files, favicons and manifest reach the nginx image.
Verify image content types and hashes: the SPA fallback can return HTML with
HTTP 200 for a missing asset, which alone is not proof of a loaded logo.
