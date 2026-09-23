# Pracovní záznamy — Lesnická aplikace

Webová aplikace pro digitalizaci každodenních pracovních záznamů v lese. Umožňuje evidenci **kácení** a **sečení**, správu číselníků, audit log změn a exporty do PDF/Excel.

## Uživatelská dokumentace

Aktuální návod k obsluze, vysvětlení rolí a pracovních postupů je v souboru [docs/uzivatelska-prirucka.md](docs/uzivatelska-prirucka.md). Příručka je živá dokumentace a musí se aktualizovat ve stejném commitu s každou změnou chování systému.

## Co aplikace dělá

- **Evidence kácení** — záznamy s pracovníky, vozidly, stroji, příslušenstvím, MTH a spotřebou paliva
- **Evidence sečení** — záznamy sečení travních ploch s MTH od/do/celkem (auto-výpočet)
- **Správa číselníků** — revíry, pracovníci, vozidla, stroje, příslušenství, typy počasí
- **Správa uživatelů** — role admin/uživatel, přihlášení přes username + heslo
- **Audit log** — sledování všech create/update/delete operací (admin only)
- **Exporty** — PDF report detailu záznamu, Excel/PDF seznam se zachováním filtrů
- **Dashboard** — statistiky, rychlé akce, poslední záznamy, admin sekce

## Technologický stack

| Vrstva       | Technologie                                      |
|-------------|--------------------------------------------------|
| Frontend    | React 19 + Vite + TypeScript + Tailwind CSS      |
| Backend     | Express 5 + TypeScript                          |
| Databáze    | PostgreSQL + Drizzle ORM                        |
| Auth        | express-session + bcryptjs                      |
| API         | OpenAPI spec + orval codegen (React Query hooks) |
| Exporty     | jsPDF + jspdf-autotable + xlsx (SheetJS)        |
| Monorepo    | pnpm workspaces                                 |

## Struktura projektu

```
/
├── artifacts/
│   ├── api-server/          # Express 5 API (porty 8080)
│   │   └── src/
│   │       ├── routes/      # REST API endpointy
│   │       ├── middlewares/ # Auth middleware
│   │       └── seed.ts      # Seed script pro ukázková data
│   └── pracovni-zaznamy/   # React + Vite frontend
│       └── src/
│           ├── pages/       # Stránky aplikace
│           ├── components/  # Formuláře a UI komponenty
│           └── lib/         # Export utility (PDF, Excel)
├── lib/
│   ├── api-spec/            # OpenAPI specifikace (openapi.yaml)
│   ├── api-client-react/    # Vygenerované React Query hooks (orval)
│   ├── api-zod/             # Vygenerované Zod schémata
│   └── db/                  # Drizzle ORM schémata + DB klient
└── pnpm-workspace.yaml
```

## Databázový model

| Tabulka                     | Popis                                        |
|-----------------------------|----------------------------------------------|
| `users`                     | Uživatelé (admin/user), soft delete          |
| `workers`                   | Pracovníci v terénu, soft delete             |
| `vehicles`                  | Vozidla, soft delete                         |
| `machines`                  | Stroje (pily, traktory...), soft delete      |
| `accessories`               | Příslušenství                                |
| `regions`                   | Revíry / pracovní oblasti, soft delete       |
| `weather_types`             | Číselník typů počasí                         |
| `felling_records`           | Záznamy kácení, soft delete                  |
| `felling_record_workers`    | Vazba kácení ↔ pracovníci                    |
| `felling_record_vehicles`   | Vazba kácení ↔ vozidla                       |
| `felling_record_machines`   | Vazba kácení ↔ stroje                        |
| `felling_record_accessories`| Vazba kácení ↔ příslušenství                 |
| `mowing_records`            | Záznamy sečení, soft delete                  |
| `mowing_record_workers`     | Vazba sečení ↔ pracovníci                    |
| `mowing_record_machines`    | Vazba sečení ↔ stroje                        |
| `mowing_record_accessories` | Vazba sečení ↔ příslušenství                 |
| `audit_logs`                | Audit log všech změn                         |

## Jak spustit lokálně

### 1. Naklonujte repozitář

```bash
git clone <repo-url>
cd pracovni-zaznamy
```

### 2. Nainstalujte závislosti

```bash
pnpm install
```

### 3. Nastavte proměnné prostředí

Zkopírujte a upravte soubor `.env`:

```bash
cp .env.example .env
```

Minimálně je třeba nastavit:

```env
DATABASE_URL=postgres://user:password@localhost:5432/pracovni_zaznamy
SESSION_SECRET=vas-tajny-klic-minimalne-32-znaku-dlouhy
NODE_ENV=development
```

### 4. Spusťte migrace databáze

```bash
cd lib/db
pnpm run db:push
cd ../..
```

### 5. Spusťte seed (ukázková data)

```bash
pnpm --filter @workspace/api-server run seed
```

### 6. Spusťte aplikaci

```bash
# API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Frontend (v druhém terminálu)
pnpm --filter @workspace/pracovni-zaznamy run dev
```

## Jak spustit přes Docker

Vytvořte `docker-compose.yml`:

```yaml
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pracovni_zaznamy
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: securepassword
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build:
      context: .
      dockerfile: artifacts/api-server/Dockerfile
    environment:
      DATABASE_URL: postgres://appuser:securepassword@db:5432/pracovni_zaznamy
      SESSION_SECRET: your-super-secret-session-key-32-chars-min
      NODE_ENV: production
      PORT: 8080
    ports:
      - "8080:8080"
    depends_on:
      - db

  web:
    build:
      context: .
      dockerfile: artifacts/pracovni-zaznamy/Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  pgdata:
```

```bash
# Sestavení a spuštění
docker-compose up --build -d

# Migrace (první spuštění)
docker-compose exec api pnpm run db:push

# Seed
docker-compose exec api pnpm run seed
```

## Nastavení `.env`

| Proměnná         | Popis                                                   | Příklad                                        |
|------------------|---------------------------------------------------------|------------------------------------------------|
| `DATABASE_URL`   | PostgreSQL connection string                            | `postgres://user:pass@localhost:5432/mydb`     |
| `SESSION_SECRET` | Tajný klíč pro session cookies (min. 32 znaků)         | `nahodny-retezec-alespon-32-znaku-dlouhy`      |
| `NODE_ENV`       | Prostředí                                               | `development` nebo `production`                |
| `PORT`           | Port API serveru (výchozí 8080)                        | `8080`                                         |

## Jak spustit migrace

```bash
# Aplikovat změny schématu (bezpečné, zachová data)
cd lib/db && pnpm run db:push

# Po změně OpenAPI specifikace — regenerace hooks
pnpm --filter @workspace/api-spec run codegen
```

## Jak spustit seed

Seed vytvoří ukázková data: uživatele, číselníky a záznamy kácení/sečení.

```bash
pnpm --filter @workspace/api-server run seed
```

**Seed smaže a znovu vytvoří:**
- Seed uživatele (admin, jannovak, petrsvoboda)
- Číselníky (revíry, pracovníci, vozidla, stroje, příslušenství, počasí)
- Vzorové záznamy kácení (6) a sečení (6)

## Přihlašovací údaje po seedu

| Uživatel      | Heslo      | Role        |
|---------------|------------|-------------|
| `admin`       | `admin123` | **Admin**   |
| `jannovak`    | `test123`  | Uživatel    |
| `petrsvoboda` | `petr123`  | Uživatel    |

## Jak provést update verze

```bash
# 1. Stáhněte změny
git pull

# 2. Nainstalujte nové závislosti
pnpm install

# 3. Aplikujte migrace databáze
cd lib/db && pnpm run db:push && cd ../..

# 4. Regenerujte API klienta (pokud se změnila OpenAPI spec)
pnpm --filter @workspace/api-spec run codegen

# 5. Restartujte aplikaci
docker-compose up --build -d
# nebo při lokálním vývoji restartujte dev server
```

> **Data jsou zachována** — `db:push` pouze přidává nové tabulky/sloupce, nemazuje existující data.

## Role a oprávnění

| Funkce                           | Uživatel | Admin |
|----------------------------------|----------|-------|
| Přihlášení                       | ✅       | ✅    |
| Vytvořit / upravit vlastní záznam| ✅       | ✅    |
| Smazat vlastní záznam            | ✅       | ✅    |
| Zobrazit záznamy ostatních       | ❌       | ✅    |
| Smazat záznamy ostatních         | ❌       | ✅    |
| Správa číselníků                 | ❌       | ✅    |
| Správa uživatelů                 | ❌       | ✅    |
| Audit log                        | ❌       | ✅    |
| Export PDF / Excel               | ✅       | ✅    |

## API přehled

Aplikace implementuje REST API dle OpenAPI specifikace v `lib/api-spec/openapi.yaml`.

| Endpoint                         | Metoda | Popis                         |
|----------------------------------|--------|-------------------------------|
| `/api/auth/login`                | POST   | Přihlášení                    |
| `/api/auth/logout`               | POST   | Odhlášení                     |
| `/api/auth/me`                   | GET    | Aktuální uživatel             |
| `/api/felling-records`           | GET    | Seznam záznamů kácení         |
| `/api/felling-records`           | POST   | Nový záznam kácení            |
| `/api/felling-records/:id`       | GET    | Detail záznamu kácení         |
| `/api/felling-records/:id`       | PUT    | Úprava záznamu kácení         |
| `/api/felling-records/:id`       | DELETE | Smazání záznamu kácení        |
| `/api/mowing-records`            | GET    | Seznam záznamů sečení         |
| `/api/mowing-records`            | POST   | Nový záznam sečení            |
| `/api/mowing-records/:id`        | GET    | Detail záznamu sečení         |
| `/api/mowing-records/:id`        | PUT    | Úprava záznamu sečení         |
| `/api/mowing-records/:id`        | DELETE | Smazání záznamu sečení        |
| `/api/users`                     | GET    | Seznam uživatelů (admin)      |
| `/api/workers`                   | GET    | Seznam pracovníků             |
| `/api/vehicles`                  | GET    | Seznam vozidel                |
| `/api/machines`                  | GET    | Seznam strojů                 |
| `/api/regions`                   | GET    | Seznam revírů                 |
| `/api/weather-types`             | GET    | Typy počasí                   |
| `/api/dashboard/stats`           | GET    | Statistiky dashboardu         |
| `/api/dashboard/recent-records`  | GET    | Poslední záznamy              |
| `/api/audit-logs`                | GET    | Audit log (admin)             |
