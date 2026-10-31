# ZenOps visual identity

The reference for the Zentinel brand palette is https://zentinel.cz,
inspected on 2026-10-31. ZenOps uses its navy canvas `#040814`, cyan
`#00bfff`, light cyan `#7ee4ff`, orange `#ff6a3d`, light orange `#ff9d7d`,
text `#f4f8ff` and secondary text `#9fb0c9`.

`apps/web/src/brand.css` defines shared semantic tokens. Existing component
styles consume those tokens; `appearance.css` defines the shared controls,
surfaces, navigation and fluid layout refinements. Update the tokens rather
than introducing another independent palette for an individual role.

Primary controls use light cyan with navy text for contrast. Brand gradients
are restricted to small identity elements and selected primary actions.
Orange highlights returned work and closed periods. Approved states remain
green, pending states amber and errors red, always accompanied by text.
Color alone must never communicate the state of an operational record.

The same design applies to sign-in, Worker, Leader, Admin and Accountant,
including nested forms, record details and correction/account dialogs.
Layouts flow from 320px mobile through tablet and large desktop widths.
Reports retain a local horizontal scroll area where tabular data requires
it. Main navigation on phones shows labels as well as icons and scrolls
horizontally without widening the page. Keyboard focus remains visible;
reduced-motion preferences and device safe areas are respected.

The final logo was supplied as ZenOps.png on 2026-10-31 (1254×1254 RGB).
Only unused outer background was cropped: full logo including wordmark
uses bounds (240,140)–(1015,1120); the square symbol uses
(250,145)–(1004,899). The supplied artwork, colors and proportions are
preserved. Local derived assets live in apps/web/public/brand.

`BrandMark.tsx` uses the full logo at sign-in and the square symbol in every
role header. Surrounding text supplies the accessible product name; repeated
decorative images have empty alt text. Favicons, Apple touch icon and web
manifest use appropriately sized square symbols. The daily PDF embeds a
96px PNG through report-brand.ts, so rendering needs no network request.
README uses the full logo. Do not fetch artwork from third-party URLs at
runtime. Future logo replacements must update these derived assets together.

This is a presentation change. Role permissions, operational rules and
stored data are unaffected; no database migration is required.
