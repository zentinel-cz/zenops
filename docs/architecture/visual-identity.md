# ZenOps visual identity

The current palette follows the supplied ZenOps logo, as requested on
2026-10-31: navy canvas `#050817`, cyan `#28cfff`, light cyan `#8cecff`,
blue `#3165ff`, violet `#793cff`, light violet `#c1a7ff`, text `#f4f8ff`
and secondary text `#9fb0c9`. This replaces the earlier Zentinel website
palette and its orange brand accents.

`apps/web/src/brand.css` defines shared semantic tokens. Existing component
styles consume those tokens; `appearance.css` defines the shared controls,
surfaces, navigation and fluid layout refinements. Update the tokens rather
than introducing another independent palette for an individual role.

Primary controls use light cyan with navy text for contrast. Brand gradients
are restricted to small identity elements and selected primary actions.
Returned work and closed periods use amber attention colors. Approved
states remain green, pending states amber and errors red, accompanied by text.
Color alone must never communicate the state of an operational record.

The same design applies to sign-in, Worker, Leader, Admin and Accountant,
including nested forms, record details and correction/account dialogs.
Layouts flow from 320px mobile through tablet and large desktop widths.
Reports retain a local horizontal scroll area where tabular data requires
it. Main navigation on phones shows labels as well as icons and scrolls
horizontally without widening the page. Keyboard focus remains visible;
reduced-motion preferences and device safe areas are respected.

The final logo was supplied as ZenOps.png on 2026-10-31 (1254×1254 RGB).
The original opaque assets are retained as references. Current transparent
assets remove the dark backdrop and surrounding tile, retaining the actual
symbol and lettering. The source symbol region (340,235)–(915,795) and
lettering region (240,920)–(1015,1120) are extracted with smooth alpha edges.
The original symbol and lettering are composed horizontally into a 1010×250
lockup for sign-in; their individual proportions and colors are preserved.
Local derived assets live in apps/web/public/brand with transparent/symbol
filenames. The original supplied file remains untouched.

`BrandMark.tsx` uses the transparent horizontal logo at sign-in and the square symbol in every
role header. Surrounding text supplies the accessible product name; repeated
decorative images have empty alt text. Favicons, Apple touch icon and web
manifest use appropriately sized square symbols. The daily PDF embeds a
96px PNG through report-brand.ts, so rendering needs no network request.
README uses the full logo. Do not fetch artwork from third-party URLs at
runtime. Future logo replacements must update these derived assets together.

This is a presentation change. Role permissions, operational rules and
stored data are unaffected; no database migration is required.
