# Migration Report: SQLite → PostgreSQL

Status: **complete and verified locally.** This document records what changed, what was
tested, and what's still needed to go live on Render.

## What changed

| Area | Before | After |
|---|---|---|
| `database/prisma/schema.prisma` datasource | `provider = "sqlite"` | `provider = "postgresql"` |
| Migrations | `database/prisma/migrations/` (11 SQLite-specific migrations) | Archived to `database/prisma/migrations_sqlite_archive/`; replaced with one fresh migration, `20260719064735_init_postgres`, generated directly from the current schema |
| `DATABASE_URL` format | `file:./dev.db` | `postgresql://user:password@host:port/database` |
| `lib/search.ts` | Relied on SQLite's default case-insensitive `contains` | Added a `ci()` helper (`{ contains, mode: "insensitive" }`) to every text search field — Postgres's default `contains` is case-sensitive, so this was required to keep search behavior identical, not a behavior change |
| Settings → Backup section | "Copy `database/prisma/dev.db`" | Describes Postgres backup (host's automated backups or `pg_dump`) |
| README, PROJECT_STRUCTURE.md | SQLite/single-file framing | PostgreSQL framing, points to this doc and `RENDER_DEPLOYMENT.md` |
| `.gitignore` | "database (SQLite)" comment | Updated comment; entries kept so the legacy file/backups are never committed |
| New: `scripts/migrate-sqlite-to-postgres.ts` | — | One-time data-migration tool (see below) |
| New: `.env.example` | — | Didn't exist before; now documents the required variables with placeholder values |

**Explicitly did not change**: any business logic, any financial calculation, any Prisma
model, field, or relation. The schema's models are byte-for-byte identical except for the
one `datasource` line — verified by generating the Postgres migration from the *unmodified*
model definitions and confirming all 21 tables, 29 foreign keys, and 8 unique indexes came
out matching the original schema's relationships.

## Data migration

Schema migration alone only creates empty tables. `scripts/migrate-sqlite-to-postgres.ts`
copies existing rows across, in FK-safe order, converting SQLite's raw integer encodings
(0/1 for booleans, epoch-milliseconds for dates) back into proper Postgres types.

```bash
DATABASE_URL="<your-postgres-url>" SQLITE_PATH="./database/prisma/dev.db" \
  npx tsx scripts/migrate-sqlite-to-postgres.ts
```

**Tested against a real, temporary local PostgreSQL instance** (not a mock) with your actual
`dev.db` data: every table migrated with an exact row-count match — 8 roles, 7 branches, 7
categories, 5 settings, 4 users, 16 products, 1 supplier, 162 login attempts, 32 sessions,
15 stock receipts, 15 stock movements, 71 audit logs. Spot-checked booleans (`active`,
`locked`) and timestamps (`createdAt`) came back correctly typed, not as raw integers.

**This script has not been run against your production data or a real Render Postgres
instance** — only against a disposable local copy for verification. Run it yourself against
your real target when you're ready to cut over (see the deployment guide).

## Verification performed

All of the following were tested against a real local PostgreSQL 18 instance (not SQLite,
not mocked), running the actual built application:

- ✅ Build (`npm run build`), TypeScript (`tsc --noEmit`), ESLint — all clean
- ✅ `prisma migrate deploy` + `prisma generate` + `db:seed` — the exact sequence `npm run
  setup` runs, tested against a completely fresh, empty Postgres database (simulating a
  first-time Render deploy)
- ✅ Authentication — seeded admin's bcrypt password hash created and verified correctly
  against Postgres-stored data (correct password accepted, wrong password rejected)
- ✅ Authorization/RBAC — real HTTP requests with real sessions for both a `super_admin` and
  a `branch_manager` test user confirmed correct page-level access (denied on
  Users/Suppliers for branch_manager, allowed on Products, full access for super_admin)
- ✅ Dashboard, Daily Reports, Inventory, Products, Suppliers, Goods Received, Supplier
  Payments, Finance, Reports, Users, Branches, Settings — all return HTTP 200 with correct
  content against the migrated database
- ✅ Search — case-insensitive matching confirmed working (the exact behavior the `ci()` fix
  was for) against real migrated branch data
- ✅ PDF export and Excel export — both generated valid, correctly-sized files
  (`branch` report: 331KB PDF, 96KB XLSX)
- ✅ A real write + read-back (branch notes update) round-tripped correctly
- ✅ Data Management (Cash Reset preview) rendered correct live record counts from Postgres
- ✅ Health check (`/api/health`) reports healthy against the Postgres connection

## What's still required before this is live on Render

1. **Provision a real Render Postgres instance** — everything above was verified against a
   temporary local Postgres; you need Render's actual managed instance for production.
2. **Run the data migration script** against that real instance if you want to keep existing
   data (branches, users, any real supplier/report history) rather than starting fresh.
3. **Set the real environment variables** on Render (see `RENDER_DEPLOYMENT.md`).
4. **Rotate `SESSION_SECRET`** to a real random value for production (it's still the dev
   placeholder in `.env`).
5. Decide what happens to the local `dev.db` file — it's untouched and still on disk as a
   safety net; delete it only once you've confirmed the Postgres data is correct and complete.
