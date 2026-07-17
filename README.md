# Faraj OS — Business Operating System

A modern, admin-first business management platform for **Faraj Trading Limited**
(wholesale & retail distribution · 6+ branches · dual-currency **CDF / USD**).

Built to replace WhatsApp evening reports, paper records and Excel with a real-time
dashboard, branch performance tracking, inventory valuation, supplier management, and
financial reporting.

See [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) for how the codebase is organized.

---

## Overview

Faraj OS centralizes daily branch reporting, inventory, finance, and supplier
management into a single system with:

- A real-time dashboard summarizing today's operations across all branches
- Role-based access control with granular, per-user permission overrides
- Dual-currency (CDF/USD) tracking that never silently mixes currencies
- A full audit trail — every create/edit/delete/approve action is logged

## Key Features

- **Daily Reports** — a guided wizard to record each branch's evening report (cash,
  stock received, expenses), with a pending → approved lifecycle, locking, and a Trash
  for restoring or permanently deleting reports
- **Dashboard** — a today-only operations view: cash collected, available cash, branch
  ranking, quick actions, and recent activity
- **Products & Inventory** — product catalogue, stock movements, warehouse & branch
  valuations
- **Branches** — branch profiles, performance scores, and manager assignment
- **Finance** — cash, profit & loss, and month-over-month comparisons
- **Suppliers** — supplier directory, goods received, purchases, payments, and
  outstanding balance tracking
- **Reports** — generate and export Daily, Weekly, Monthly, Branch, Inventory,
  Finance, Expense, Profit, and Supplier reports as branded Excel, PDF, or print output
- **User Management** — roles, a per-user permission matrix, branch assignment,
  lock/unlock, activate/deactivate, password reset, login history, and activity log

## User Roles & Permissions

Access is controlled by role, with optional per-user overrides for finer-grained
control:

| Role | Typical Access |
| --- | --- |
| **Super Administrator** | Full system access |
| **General Administrator** | Full system access |
| **Branch Manager** | Manage their assigned branch's daily reports; view-only elsewhere |
| **Accountant** | Finance and suppliers (view/create/edit), reports (view/export) |
| **Inventory Officer** | Products, inventory, and goods received |
| **Auditor** | Read-only access across every module, including settings |
| **Viewer** | Read-only access to core business modules |

## Tech Stack

- **Next.js 16** (App Router, React 19, TypeScript) — server components + server actions
- **Prisma + SQLite** — the entire database is one file (`database/prisma/dev.db`), which
  doubles as the backup unit
- **Pure-CSS design system** — theme-aware (light/dark), no UI framework, no webfont fetch
- **bcrypt** password auth with server-side sessions (httpOnly cookie), an idle
  timeout, and login-attempt lockout

## Getting Started

```bash
npm install          # install dependencies
npm run setup        # create the database, generate the client, and seed
npm run dev          # start the dev server → http://localhost:3000
```

## Demo Login / Initial Admin Setup

`npm run setup` seeds a demo administrator account so you can sign in immediately:

- **Email:** `admin@example.com`
- **Password:** `<configured during setup>`

> These are placeholders — the actual seeded credentials are set by the seed script
> on your machine and are never committed to this repository. Change them in
> **Settings** immediately after your first sign-in.

## Useful Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run setup` | Migrate + generate + seed (first-time setup) |
| `npm run db:seed` | Re-seed branches, warehouse, categories, roles, admin |
| `npm run db:migrate` | Create/apply a Prisma migration |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Open Prisma Studio against `database/prisma/dev.db` |
| `npm run db:reset` | Wipe and recreate the database, then seed |

## System Modules

1. **Dashboard** — today's operations at a glance: cash collected, available cash,
   branch ranking, quick actions, and recent activity.
2. **Daily Reports** — a step-by-step wizard to transcribe each branch's evening
   report (branch → stock received → cash CDF+USD → expenses → review). Saved as
   *pending*, then approved to *lock*. Every submission updates the dashboard,
   inventory, and branch scores.
3. **Products** — catalogue with base cost (Head Office) per item.
4. **Inventory** — warehouse & branch stock value, movements.
5. **Branches** — branch profiles, health scores, ranking, and the Friday/month-end
   inventory valuation entry.
6. **Finance** — cash, profit & loss, month-vs-previous comparison.
7. **Suppliers** — supplier directory, goods received (updates inventory), purchases
   (invoices & outstanding balance), payments, and dedicated supplier reports.
8. **Reports** — generate/export Daily, Weekly, Monthly, Branch, Inventory, Finance,
   Expense, Profit, and Supplier reports as colored, branded Excel, PDF, or print output.
9. **User Management** — roles, per-user permission matrix, branch assignment,
   lock/unlock, activate/deactivate, password reset, login history, activity log.
10. **Settings** — company (name, logo), currencies (live CDF↔USD rate), branches,
    backup, audit logs.

## How Dual-Currency CDF/USD Works

CDF and USD are **always tracked separately** — never auto-mixed. A manual exchange
rate (Settings → Currencies) is used only for *combined display estimates* on the
dashboard.

The dashboard also distinguishes two figures that are easy to confuse:

- **Total Cash Collected** — money received from branches; never reduced by expenses
  or supplier payments
- **Available Cash** — Total Cash Collected minus supplier payments and branch expenses

## Data Model

See [`database/prisma/schema.prisma`](database/prisma/schema.prisma). Key tables:
`User`, `Role`, `UserPermission`, `UserBranch`, `LoginAttempt`, `Session`, `Branch`,
`Category`, `Product`, `BranchPrice`, `DailyReport`, `StockReceipt`, `Expense`,
`InventoryValuation`, `StockMovement`, `Supplier`, `GoodsReceipt`, `SupplierPurchase`,
`SupplierPayment`, `Setting`, `AuditLog`.

## Backup

The whole system is the single file `database/prisma/dev.db`. Copy it to back up
everything; restore by putting it back. (It is git-ignored so your data is never
committed by accident.) Timestamped snapshots taken during maintenance live in
`database/backup/`.

## Deployment

Any Node host works. For a persistent SQLite file use a host with a writable disk
(Railway, Render, Fly.io, a VPS). Set the `DATABASE_URL` and `SESSION_SECRET`
environment variables, run `npm run build`, then `npm run start`. To move to Postgres
later, change the Prisma datasource and re-run migrations — application code is
unchanged.

## Roadmap

- Per-branch selling prices → exact profit (units sold × margin)
- Per-branch data scoping (Branch Manager sees only their assigned branch's data)
- Real OTP delivery via email/SMS (the two-step flow was built and later simplified
  back to single-step pending a delivery provider)
- Language: English / French / bilingual
