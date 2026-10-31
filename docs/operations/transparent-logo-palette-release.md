# Transparent logo and ZenOps palette — 2026-10-31

The user requested removal of the logo backdrop and application colors based
on the supplied logo rather than the Zentinel website. The original source
and earlier opaque derivatives remain intact. New transparent PNG/WebP
assets retain the symbol and lettering; only the dark backdrop/tile is
removed. A horizontal lockup provides a compact sign-in header. Versioned
filenames avoid stale cached logo files after deployment.

Shared tokens now use navy, cyan, blue and violet from the logo. Text and
primary-control gradients use lighter variants for contrast; approved,
pending and error colors retain their semantic roles. Returned work and
closed periods use amber. Updated assets cover all role headers, browser
icons, touch icon, web manifest, README and embedded PDF logo. PDF summary
accents use blue. No domain rule, authorization or schema change is involved.

Validation: actual alpha-channel range 0–255; dark-background compositing
and mobile sign-in screenshots inspected; 60 sign-in/role/viewport checks
passed at widths 320,360,390,480,600,768,820,1024,1280,1440,1920,2560px.
All visible logos loaded and no page overflow was detected. API/web type
checks and builds passed. All 65 API tests passed. Actual PDF generation
and Poppler rendering confirmed a clean logo on a white report background.

Deploy API and web together through existing GitHub automation. Public
assets are explicitly included in the web Dockerfile. Verify runtime JS,
logo asset hashes and actual image content types before reporting deployment.
