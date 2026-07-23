<p align="center">
  <img src="public/faraj-logo-plaque.png" alt="Faraj Trading Limited" width="220" />
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-hosted-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="Render" src="https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=flat-square&logo=render&logoColor=white" />
</p>

# Faraj OS — Business Operating System

A modern, admin-first business management platform for **Faraj Trading Limited**
(wholesale & retail distribution · 6+ branches · dual-currency **CDF / USD**).

Built to replace WhatsApp evening reports, paper records and Excel with a real-time
dashboard, branch performance tracking, inventory valuation, supplier management, and
financial reporting.

See [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) for how the codebase is organized.
Additional docs: [`DATABASE_MIGRATION.md`](DATABASE_MIGRATION.md) ·
[`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md)

---

## 📑 Table of Contents

<a id="toc"></a>

- <a href="#overview">Overview</a>
- <a href="#screenshots">Screenshots</a>
- <a href="#key-features">Key Features</a>
- <a href="#architecture-overview">Architecture Overview</a>
- <a href="#tech-stack">Tech Stack</a>
- <a href="#security-features">Security Features</a>
- <a href="#production-ready-features">Production-Ready Features</a>
- <a href="#user-roles--permissions">User Roles &amp; Permissions</a>
- <a href="#authentication--authorization">Authentication &amp; Authorization</a>
- <a href="#audit-logging">Audit Logging</a>
- <a href="#getting-started">Getting Started</a>
- <a href="#demo-login--initial-admin-setup">Demo Login / Initial Admin Setup</a>
- <a href="#local-development-guide">Local Development Guide</a>
- <a href="#database-setup">Database Setup</a>
- <a href="#environment-variables">Environment Variables</a>
- <a href="#useful-scripts">Useful Scripts</a>
- <a href="#system-modules">System Modules</a>
- <a href="#how-dual-currency-cdfusd-works">How Dual-Currency CDF/USD Works</a>
- <a href="#data-model">Data Model</a>
- <a href="#project-folder-structure">Project Folder Structure</a>
- <a href="#api-overview">API Overview</a>
- <a href="#backup">Backup</a>
- <a href="#backup--recovery-details">Backup & Recovery — Details</a>
- <a href="#deployment">Deployment</a>
- <a href="#deployment-architecture">Deployment Architecture</a>
- <a href="#performance-optimizations">Performance Optimizations</a>
- <a href="#scalability-considerations">Scalability Considerations</a>
- <a href="#roadmap">Roadmap</a>
- <a href="#project-statistics">Project Statistics</a>
- <a href="#license">License</a>
- <a href="#contact">Contact</a>

---

<a id="overview"></a>
## Overview

Faraj OS centralizes daily branch reporting, inventory, finance, and supplier
management into a single system with:

- A real-time dashboard summarizing today's operations across all branches
- Role-based access control with granular, per-user permission overrides
- Dual-currency (CDF/USD) tracking that never silently mixes currencies
- A full audit trail — every create/edit/delete/approve action is logged

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="screenshots"></a>
## 📸 Screenshots

> Screenshots are not yet committed to this repository. Add real captures to `docs/screenshots/` and reference them here — the layout below is ready to go as soon as images are added.

| Dashboard | Daily Reports |
|---|---|
| _Screenshot pending — `docs/screenshots/dashboard.png`_ | _Screenshot pending — `docs/screenshots/daily-reports.png`_ |

| Finance | Suppliers |
|---|---|
| _Screenshot pending — `docs/screenshots/finance.png`_ | _Screenshot pending — `docs/screenshots/suppliers.png`_ |

| User Management | Login |
|---|---|
| _Screenshot pending — `docs/screenshots/users.png`_ | _Screenshot pending — `docs/screenshots/login.png`_ |

```md
<!-- Once available, reference images like this: -->
![Dashboard](docs/screenshots/dashboard.png)
```

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="key-features"></a>
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

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="architecture-overview"></a>
## 🏗️ Architecture Overview

Faraj OS is a single Next.js application — no separate backend service. Server Components and Server Actions call directly into a shared business-logic layer (`lib/`), which talks to PostgreSQL through Prisma.

```mermaid
flowchart LR
    Browser["Browser<br/>(React 19 UI)"]
    App["Next.js 16 App Router<br/>Server Components + Server Actions"]
    Lib["lib/<br/>permissions · session · metrics · search · reports"]
    Prisma["Prisma ORM"]
    DB[("PostgreSQL")]

    Browser <-->|HTTPS + session cookie| App
    App --> Lib
    Lib --> Prisma
    Prisma <--> DB
```

- **Presentation** — Server Components render pages with data already fetched; Client Components are used only where interactivity is required (search, wizards, toggles)
- **Mutations** — Server Actions in `app/actions.ts` and per-module `actions.ts` files, each starting with a permission check
- **Business logic** — centralized in `lib/` (`permissions.ts`, `session.ts`, `metrics.ts`, `search.ts`, `reports.ts`, `settings.ts`, `format.ts`, `units.ts`)
- **Data access** — Prisma Client (`lib/db.ts`) against a single PostgreSQL database, schema defined in `database/prisma/schema.prisma`

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="tech-stack"></a>
## Tech Stack

- **Next.js 16** (App Router, React 19, TypeScript) — server components + server actions
- **Prisma + PostgreSQL** — hosted on Render (or any Postgres provider)
- **Pure-CSS design system** — theme-aware (light/dark), no UI framework, no webfont fetch
- **bcrypt** password auth with server-side sessions (httpOnly cookie), an idle
  timeout, and login-attempt lockout

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="security-features"></a>
## 🔐 Security Features

| Feature | Detail |
|---|---|
| Password storage | Hashed with bcrypt — plaintext passwords are never stored |
| Sessions | Server-side, database-backed (`Session` table) — not stateless JWTs, so any session can be revoked instantly |
| Session cookies | `httpOnly`, hard 30-day expiry; without "remember me" the cookie is a browser-session cookie cleared on close |
| Idle timeout | Warning shown after 4 minutes idle, forced logout at 5 minutes idle |
| Login lockout | Account locks after 10 consecutive failed login attempts, recorded with a lock reason and timestamp |
| Login attempt logging | Every attempt (success or failure) is recorded in `LoginAttempt` for review |
| Authorization | Every page and every Server Action re-checks permissions server-side — the UI is never the security boundary |
| Per-user overrides | Permissions can be granted/revoked per user on top of their role's defaults (`UserPermission`) |
| Audit trail | Every create/update/delete/lock/approve action is written to `AuditLog` with actor, action, entity, and detail |
| Secrets | Database URL, session secret, and admin bootstrap credentials are read from environment variables only — never committed |

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="production-ready-features"></a>
## 🚀 Production-Ready Features

- Health check endpoint at [`/api/health`](app/api/health/route.ts) for uptime monitoring
- Reproducible infrastructure via `render.yaml` (Blueprint: Web Service + managed Postgres)
- Idempotent deploy pipeline — `npm run setup` runs `prisma migrate deploy` → `prisma generate` → seed, safe to re-run
- Seed-based initial admin bootstrap driven entirely by environment variables (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) — no hardcoded credentials
- Debounced (200ms), cancellable global search (`Ctrl/⌘+K`) across branches, products, and reports
- Server-rendered data on every module page — no loading spinners for the initial page load
- Consistent server-side validation for every mutation, independent of client state

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="user-roles--permissions"></a>
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

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="authentication--authorization"></a>
## 🔑 Authentication & Authorization

1. **Login** — email/username + password checked against a bcrypt hash; failed attempts increment a counter and lock the account at 10 in a row
2. **Session creation** — a random token is generated and stored server-side in the `Session` table, with the browser holding only an `httpOnly` cookie referencing it
3. **Every request** — the current user is resolved from the session, `active`/`locked` status is checked, and `lastActivityAt` is updated for idle-timeout tracking
4. **Every page** — the user's **effective permissions** (their role's defaults merged with any per-user overrides) are resolved before rendering
5. **Every mutation** — Server Actions re-run the same permission check before touching the database, so access control never depends on which UI is shown

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="audit-logging"></a>
## 🧾 Audit Logging

Every meaningful state change — creating a report, approving/unlocking it, editing a user, changing a role, resetting a password, updating settings — is written to the `AuditLog` table, recording:

- who performed the action
- what happened (e.g. `create`, `approve`, `lock`, `reset-password`)
- what it happened to, plus a human-readable detail
- which branch it relates to, when applicable
- when it happened

Audit history is surfaced in two places: a system-wide feed under **Settings → Audit Logs** (for users with settings access) and a per-user recent-activity view in the **User Detail** modal. The dashboard's "Recent Activity" panel and each branch's activity timeline are also powered by this same table.

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="getting-started"></a>
## Getting Started

```bash
npm install          # install dependencies
# set ADMIN_EMAIL and ADMIN_PASSWORD in .env — see below
npm run setup        # create the database, generate the client, and seed
npm run dev          # start the dev server → http://localhost:3000
```

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="demo-login--initial-admin-setup"></a>
## Demo Login / Initial Admin Setup

`npm run setup` seeds an administrator account using the `ADMIN_EMAIL` and
`ADMIN_PASSWORD` environment variables — set these in your `.env` before running
setup. They are never hardcoded or committed to this repository. Change the
password in **Settings** immediately after your first sign-in.

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="local-development-guide"></a>
## 💻 Local Development Guide

1. Install dependencies: `npm install`
2. Create `.env` from `.env.example` and point `DATABASE_URL` at a local or reachable PostgreSQL instance
3. Run `npm run setup` once to migrate the schema, generate the Prisma client, and seed the initial admin
4. Start the dev server: `npm run dev`
5. Use `npm run db:studio` to browse/edit data visually via Prisma Studio while developing
6. Run `npm run lint` before committing

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="database-setup"></a>
## 🗃️ Database Setup

Faraj OS runs on PostgreSQL, managed through Prisma migrations in `database/prisma/migrations/`.

- **Fresh setup** — `npm run setup` applies all migrations, generates the client, and seeds the initial admin (safe to re-run)
- **New migration during development** — `npm run db:migrate` (creates and applies a migration from schema changes)
- **Full reset** (destructive, local only) — `npm run db:reset` drops and recreates the schema, then reseeds
- **Migrating from an older SQLite-based checkout** — see [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md) and `scripts/migrate-sqlite-to-postgres.ts`, which copies data across in FK-safe order and converts SQLite's raw encodings (booleans, epoch timestamps) into proper Postgres types

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="environment-variables"></a>
## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in real values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://USER:PASSWORD@HOST:5432/DATABASE` |
| `SESSION_SECRET` | Yes | Long random string used to secure sessions |
| `ADMIN_EMAIL` | Yes (first setup) | Email for the initial admin account, read by `database/prisma/seed.ts` |
| `ADMIN_PASSWORD` | Yes (first setup) | Password for the initial admin account, read by `database/prisma/seed.ts` |

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="useful-scripts"></a>
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
| `npm run db:studio` | Open Prisma Studio against `DATABASE_URL` |
| `npm run db:reset` | Wipe and recreate the database, then seed |

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="system-modules"></a>
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

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="how-dual-currency-cdfusd-works"></a>
## How Dual-Currency CDF/USD Works

CDF and USD are **always tracked separately** — never auto-mixed. A manual exchange
rate (Settings → Currencies) is used only for *combined display estimates* on the
dashboard.

The dashboard also distinguishes two figures that are easy to confuse:

- **Total Cash Collected** — money received from branches; never reduced by expenses
  or supplier payments
- **Available Cash** — Total Cash Collected minus supplier payments and branch expenses

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="data-model"></a>
## Data Model

See [`database/prisma/schema.prisma`](database/prisma/schema.prisma). Key tables:
`User`, `Role`, `UserPermission`, `UserBranch`, `LoginAttempt`, `Session`, `Branch`,
`Category`, `Product`, `BranchPrice`, `DailyReport`, `StockReceipt`, `Expense`,
`InventoryValuation`, `StockMovement`, `Supplier`, `GoodsReceipt`, `SupplierPurchase`,
`SupplierPayment`, `Setting`, `AuditLog`.

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="project-folder-structure"></a>
## 📁 Project Folder Structure

> A deeper walkthrough — including "how to add a new page/mutation/component" guidance — lives in [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md). This is the current, condensed map:

```text
Faraj Trading Limited system/
├── app/
│   ├── (app)/                 # Authenticated app shell (sidebar + topbar layout)
│   │   ├── page.tsx           # Dashboard
│   │   ├── reports-daily/     # Daily Reports (+ trash)
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── branches/
│   │   ├── finance/
│   │   ├── suppliers/         # + goods-received, purchases, payments, reports
│   │   ├── reports/
│   │   ├── users/
│   │   ├── settings/
│   │   └── actions.ts         # Shared Server Actions (audit-logged mutations)
│   ├── api/
│   │   ├── health/            # Uptime check
│   │   ├── logout/
│   │   ├── products/
│   │   ├── search/            # Global search endpoint
│   │   └── reports/[type]/    # excel/ + pdf/ export routes
│   ├── login/                 # Public login route
│   └── print/[type]/          # Print-friendly report view
├── components/
│   ├── branches/  daily-reports/  dashboard/  layout/
│   ├── products/  reports/  settings/  shared/
│   ├── suppliers/  users/
├── lib/
│   ├── db.ts             # Prisma client singleton
│   ├── session.ts        # Session lifecycle, idle timeout
│   ├── permissions.ts    # RBAC + per-user overrides
│   ├── permissionTypes.ts
│   ├── metrics.ts        # Dashboard/branch metrics queries
│   ├── search.ts         # Global search
│   ├── reports.ts        # Excel/PDF export logic
│   ├── settings.ts  format.ts  units.ts  username.ts  toast.ts  docTheme.ts  idleTimeout.ts
├── database/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   ├── migrations/                # Active PostgreSQL migrations
│   │   └── migrations_sqlite_archive/ # Archived pre-migration history
│   └── backup/                        # Local SQLite-era backups (legacy)
├── scripts/
│   └── migrate-sqlite-to-postgres.ts  # One-time SQLite → Postgres data migration
├── public/                # Logo assets (header, icon, plaque)
├── render.yaml            # Render Blueprint (Web Service + Postgres)
├── PROJECT_STRUCTURE.md
├── DATABASE_MIGRATION.md
├── RENDER_DEPLOYMENT.md
└── README.md
```

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="api-overview"></a>
## 🌐 API Overview

Most data operations go through Server Actions, not REST endpoints. The following route handlers exist for cases that need a plain HTTP endpoint (browser fetches, file downloads, monitoring):

| Route | Purpose |
|---|---|
| `GET /api/health` | Uptime/health check for monitoring |
| `POST /api/logout` | Ends the current session |
| `GET /api/products` | Product lookup used by client-side pickers |
| `GET /api/search?q=` | Global search across branches, products, and reports (debounced, `Ctrl/⌘+K`) |
| `GET /api/reports/[type]/excel` | Exports a report as an Excel workbook |
| `GET /api/reports/[type]/pdf` | Exports a report as a PDF |

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="backup"></a>
## Backup

The database runs on PostgreSQL. Use your host's automated backups (Render takes daily
Postgres backups automatically) or run `pg_dump` on a schedule of your own.

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="backup--recovery-details"></a>
## 💾 Backup & Recovery — Details

- Primary backup path: your PostgreSQL host's automated backups (Render provides these for managed Postgres instances)
- Manual/on-demand backup: `pg_dump` against `DATABASE_URL`
- Recovery: restore the `pg_dump` output (or host snapshot) into a fresh database and point `DATABASE_URL` at it

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="deployment"></a>
## Deployment

See [`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md) for the full Render setup guide. In
short: provision a Render Postgres instance, set `DATABASE_URL`, `ADMIN_EMAIL`, and
`ADMIN_PASSWORD`, run `npm run build`, then `npm run start` — `prisma migrate deploy` runs
as part of `npm run setup`/the release step.

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="deployment-architecture"></a>
## 🚢 Deployment Architecture

```mermaid
flowchart TB
    subgraph Render["Render (render.yaml Blueprint)"]
        Web["Web Service<br/>Next.js (npm run build → npm run start)"]
        PG[("Managed PostgreSQL")]
        Web -->|DATABASE_URL| PG
    end
    Users["Branch users / admins"] -->|HTTPS| Web
    Deploy["git push"] -->|triggers build| Web
```

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="performance-optimizations"></a>
## ⚡ Performance Optimizations

- **Server Components by default** — pages fetch their data server-side and ship no extra client JS for that data; interactivity (search, wizards, toggles) is opted into per component
- **Debounced global search** — 200ms debounce plus request cancellation (`AbortController`) so only the latest keystroke's request completes
- **No heavy UI framework runtime** — the design system is hand-written CSS, avoiding the bundle cost of a component library
- **Parallel data fetching** — dashboard and module pages load independent queries with `Promise.all` rather than sequential round-trips
- **Prisma relation indexes** — foreign keys and unique constraints (e.g. session tokens, usernames) are indexed at the schema level for fast lookups

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="scalability-considerations"></a>
## 📈 Scalability Considerations

- Sessions are stored in the database, not in-memory — the app can run multiple instances behind a load balancer without sticky sessions
- The current single-Postgres-instance setup comfortably serves a multi-branch business at today's scale; as data volume grows, connection pooling (e.g. PgBouncer) and read replicas are the natural next steps, not architectural rewrites
- Reports and exports are generated on-demand rather than pre-computed — fine at current volume, and a candidate for background jobs if export volume grows significantly
- The module boundaries in `lib/` and `components/` make it straightforward to extract a module into its own service later, if a single Next.js deployment ever stops being sufficient

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="roadmap"></a>
## Roadmap

- Per-branch selling prices → exact profit (units sold × margin)
- Per-branch data scoping (Branch Manager sees only their assigned branch's data)
- Real OTP delivery via email/SMS (the two-step flow was built and later simplified
  back to single-step pending a delivery provider)
- Language: English / French / bilingual

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="project-statistics"></a>
## 📊 Project Statistics

| Metric | Value |
|---|---|
| Prisma models | 21 |
| Route pages | 17 |
| API route handlers | 6 |
| Application source files (`app/`, `components/`, `lib/`) | ~100 TypeScript/TSX files |
| Lines of application code | ~8,000 |
| Active database migrations | 1 (`20260719064735_init_postgres`), plus an archived SQLite-era history |
| User roles | 7 |

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="license"></a>
## 📄 License

Proprietary — all rights reserved. This codebase belongs to Faraj Trading Limited and is not currently licensed for external use, modification, or redistribution. Contact the organization (see below) to discuss licensing.

<p align="right"><a href="#toc">↑ back to top</a></p>

<a id="contact"></a>
## ✉️ Contact

This is an internal business system for Faraj Trading Limited. For access requests or support, contact your organization's system administrator.

<p align="right"><a href="#toc">↑ back to top</a></p>
