# Zenops — Pracovní záznamy (Zentinel.cz)

## Popis projektu

**Zenops** je webová aplikace pro digitalizaci denních pracovních záznamů v lesnictví (kácení a sečení). Produkt firmy Zentinel.cz. Česky rozhraní, mobile-first, dvě role (admin/uživatel). Produkčně připravená aplikace s kompletní sadou funkcí.

**Branding:**
- Název: Zenops
- Primární barva: Cyan-blue HSL 197 100% 38% (Zentinel.cz brand)
- Téma: Tmavé pozadí navy (login stránka), světlé/modré pozadí (hlavní app)
- Logo: tmavý tmavomodrý header s cyan "Z" badge

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS (wouter routing, Sonner toast)
- **Backend**: Express 5 + TypeScript
- **DB**: PostgreSQL + Drizzle ORM
- **Auth**: express-session + bcryptjs (session cookies)
- **API codegen**: Orval z OpenAPI spec → React Query hooks
- **Export**: jsPDF + jspdf-autotable (PDF), xlsx/SheetJS (Excel)
- **Node.js**: 24

## Artifacts

- `artifacts/pracovni-zaznamy` — Frontend React app (path `/pracovni-zaznamy`)
- `artifacts/api-server` — Express API server (path `/api`)

## Přihlašovací údaje (seed)

| Uživatel      | Heslo      | Role     |
|---------------|------------|----------|
| `admin`       | `admin123` | admin    |
| `jannovak`    | `test123`  | uživatel |
| `petrsvoboda` | `petr123`  | uživatel |

## Seed data v DB

- 7 pracovníků, 4 vozidla, 7 strojů, 7 příslušenství, 5 revírů, 6 typů počasí
- 6 záznamů kácení + 6 záznamů sečení (duben 2026)
- 9 záznamů audit logu
- 3 seed uživatelé (admin, jannovak, petrsvoboda)

## Klíčové soubory

- `lib/api-spec/openapi.yaml` — OpenAPI kontrakt
- `lib/db/src/schema/index.ts` — Drizzle schémata
- `artifacts/api-server/src/app.ts` — Express app
- `artifacts/api-server/src/routes/` — API routy
- `artifacts/api-server/src/lib/auditLog.ts` — logAudit() helper
- `artifacts/api-server/src/seed.ts` — Seed script
- `artifacts/pracovni-zaznamy/src/App.tsx` — Frontend routing
- `artifacts/pracovni-zaznamy/src/lib/auth-context.tsx` — Auth context
- `artifacts/pracovni-zaznamy/src/lib/exportPdf.ts` — PDF export utility
- `artifacts/pracovni-zaznamy/src/lib/exportExcel.ts` — Excel export utility
- `artifacts/pracovni-zaznamy/src/pages/` — Všechny stránky
- `artifacts/pracovni-zaznamy/src/components/Layout.tsx` — Navigace + layout

## Stránky

- `/` — Dashboard s přehledem a statistikami (StatCard, QuickAction, admin sekce)
- `/kaceni` — Seznam záznamů kácení + filtrování + export Excel/PDF
- `/kaceni/novy` — Nový záznam kácení (formulář s multi-selecty)
- `/kaceni/:id` — Detail záznamu kácení (edit/delete, export PDF, toast)
- `/seceni` — Seznam záznamů sečení + filtrování + export Excel/PDF
- `/seceni/novy` — Nový záznam sečení (auto-MTH výpočet)
- `/seceni/:id` — Detail záznamu sečení (edit/delete, export PDF, toast)
- `/admin/uzivatele` — Správa uživatelů (jen admin)
- `/admin/ciselniky` — Číselníky: pracovníci, vozidla, stroje, příslušenství, revíry, počasí (jen admin)
- `/admin/audit-log` — Audit log s 5 filtry + expandovatelný JSON diff (jen admin)

## Datová struktura

### Záznamy kácení
Tabulka `felling_records`: datum, userId, regionId, location, startTime, endTime, weatherTypeId, temperature, mth, fuelConsumption, refueling, note, soft-delete (deletedAt/deletedBy)

Junction: `felling_record_workers`, `felling_record_vehicles`, `felling_record_machines`, `felling_record_accessories`

### Záznamy sečení
Tabulka `mowing_records`: datum, userId, regionId, location, startTime, endTime, weatherTypeId, vehicleId (single), mthStart, mthEnd, mthTotal, fuelConsumption, refueling, note, soft-delete

Junction: `mowing_record_workers`, `mowing_record_machines`, `mowing_record_accessories`

MTH logika: frontend automaticky dopočítá mthTotal = mthEnd - mthStart při změně obou polí.

### Audit log
Tabulka `audit_logs`: userId, action (create/update/delete), table_name, record_id, old_data (jsonb), new_data (jsonb), ip_address, user_agent, description, created_at

## Key Commands

```bash
# Regenerate API hooks (after openapi.yaml change)
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes
cd lib/db && pnpm run db:push

# Run seed (resets seed users + codebooks + sample records)
pnpm --filter @workspace/api-server run seed

# Typecheck all
pnpm run typecheck

# Build all
pnpm run build
```

## Bezpečnostní požadavky pro produkci

- `SESSION_SECRET` musí být nastaven na náhodný řetězec min. 32 znaků
- Aplikaci nasadit za HTTPS proxy (nginx/Traefik)
- `NODE_ENV=production` pro zabezpečené cookies

## Dokončené funkce

- [x] Evidence kácení (CRUD, multi-select pracovníci/vozidla/stroje/příslušenství)
- [x] Evidence sečení (CRUD, auto-MTH výpočet, single vehicle)
- [x] Správa číselníků (soft delete, aktivace/deaktivace)
- [x] Správa uživatelů (admin) — vytvoření, edit, deaktivace
- [x] Audit log (logAudit() helper, filtrování, JSON diff)
- [x] Export PDF (detail záznamu) a Excel/PDF (seznam s filtry)
- [x] Dashboard se statistikami (MTH, aktivní pracovníci, záznamy v měsíci)
- [x] Toast notifikace (Sonner) na úspěch/chybu operací
- [x] Mobilní navigace (hamburger menu, active state pro pod-stránky)
- [x] Seed script (TypeScript) s ukázkovými daty
- [x] Komplexní README s instrukcemi pro nasazení
