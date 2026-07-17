# Faraj OS — Business Operating System

A modern, admin-first business management platform for **Faraj Trading Limited**
(wholesale & retail distribution · 6+ branches · dual-currency **CDF / USD**).

Built to replace WhatsApp evening reports, paper records and Excel with a real-time
dashboard, branch performance tracking, inventory valuation and financial reporting.

Supports role-based logins (Super Administrator, General Administrator, Branch Manager,
Accountant, Inventory Officer, Auditor, Viewer) with per-user permission overrides, branch
assignment, and full account lifecycle management (lock/unlock, activate/deactivate,
password reset, login history, activity log).

See [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) for how the codebase is organized.

---

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript) — server components + server actions
- **Prisma + SQLite** — the entire database is one file (`database/prisma/dev.db`), which
  doubles as the backup unit
- **Pure-CSS design system** — theme-aware (light/dark), no UI framework, no webfont fetch
- **bcrypt** password auth with server-side sessions (httpOnly cookie), a 5-minute idle
  timeout, and login-attempt lockout

## Getting started

```bash
npm install          # install dependencies
npm run setup        # create the database, generate the client, and seed
npm run dev          # start the dev server → http://localhost:3000
```

Then sign in with the seeded demo admin:

- **Email:** `soljaman293@gmail.com`
- **Password:** `faraj2026`

> Change these in **Settings** after first sign-in.

### Useful scripts

| Script            | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Start the development server                             |
| `npm run build`   | Production build                                         |
| `npm run start`   | Run the production build                                |
| `npm run setup`   | Migrate + generate + seed (first-time setup)            |
| `npm run db:seed` | Re-seed branches, warehouse, categories, roles, admin   |
| `npm run db:migrate` | Create/apply a Prisma migration                      |
| `npm run db:generate` | Regenerate the Prisma client                       |
| `npm run db:studio` | Open Prisma Studio against `database/prisma/dev.db`   |
| `npm run db:reset`| Wipe and recreate the database, then seed               |

## Modules

1. **Dashboard** — report-submission status, dual-currency KPI tiles (cash / expenses /
   profit / inventory), cash-flow & branch charts, auto-detected business intelligence,
   branch-health leaderboard, activity feed, AI daily summary.
2. **Daily Reports** — a 5-step wizard to transcribe each branch's evening report
   (branch → stock received → cash CDF+USD → expenses → review). Saved as *pending*,
   then approved to *lock*. Every submission updates the dashboard, inventory and scores.
3. **Products** — catalogue with base cost (Head Office) per item; add/import.
4. **Inventory** — warehouse & branch stock value, movements.
5. **Branches** — Luilu 1, Luilu 2, Lumundu, Mipeto 1, Mipeto 2, KWM; health scores,
   ranking, and the Friday/month-end inventory valuation entry.
6. **Finance** — cash, profit & loss, month-vs-previous comparison.
7. **Reports** — generate/export Daily, Weekly, Monthly, Yearly, Branch, Inventory,
   Cash, Expense, Profit reports as colored, branded Excel, PDF or print output.
8. **User Management** — roles, per-user permission matrix, branch assignment, lock/
   unlock, activate/deactivate, password reset, login history, activity log.
9. **Settings** — company (name, logo), currencies (live CDF↔USD rate), branches,
   backup, audit logs.

## How money works

CDF and USD are **always tracked separately** — never auto-mixed. A manual exchange rate
(Settings → Currencies) is used only for *combined display estimates* on the dashboard.

## Data model

See [`database/prisma/schema.prisma`](database/prisma/schema.prisma). Key tables: `User`,
`Role`, `UserPermission`, `UserBranch`, `LoginAttempt`, `Session`, `Branch`, `Category`,
`Product`, `BranchPrice`, `DailyReport`, `StockReceipt`, `Expense`, `InventoryValuation`,
`StockMovement`, `Setting`, `AuditLog`.

## Backup

The whole system is the single file `database/prisma/dev.db`. Copy it to back up
everything; restore by putting it back. (It is git-ignored so your data is never
committed by accident.) Timestamped snapshots taken during maintenance live in
`database/backup/`.

## Deployment

Any Node host works. For a persistent SQLite file use a host with a writable disk
(Railway, Render, Fly.io, a VPS). Set `DATABASE_URL` and `SESSION_SECRET` env vars,
run `npm run build` then `npm run start`. To move to Postgres later, change the Prisma
datasource and re-run migrations — application code is unchanged.

## Roadmap

- Per-branch selling prices → exact profit (units sold × margin)
- Per-branch data scoping (Branch Manager sees only their assigned branch's data)
- Real OTP delivery via email/SMS (the two-step flow was built and later simplified
  back to single-step pending a delivery provider)
- Language: English / French / bilingual
