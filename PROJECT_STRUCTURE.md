# Project Structure

Faraj OS is a **Next.js 16 (App Router) full-stack application** — there is no separate
backend server. React Server Components query the database directly, Server Actions
replace what would otherwise be REST endpoints, and Next.js's own routing conventions
determine where files must live. That's a deliberate architectural choice this project
keeps: it's what makes authentication, redirects, and data fetching all work together
safely with one mental model, and it's why the layout below has one application root
(`app/`, `components/`, `lib/`) rather than separate `frontend/`/`backend/` folders.

What *is* fully separated is the **database** — schema, migrations, seed data, and
backups all live under `database/`, independent of application code.

```
.
├── app/                  → routes, pages, server actions, API routes (Next.js App Router)
├── components/           → React components, grouped by business domain
├── lib/                  → framework-agnostic server logic (the "backend" layer)
├── database/             → Prisma schema, migrations, seed script, backups
├── public/                → static assets served as-is
├── PROJECT_STRUCTURE.md   → this file
└── README.md              → setup, scripts, feature overview
```

## `app/` — routes & server logic

Next.js App Router: folder path = URL path. `page.tsx` is a route's screen,
`layout.tsx` wraps a subtree, `route.ts` is a plain HTTP endpoint, `actions.ts` files
are Server Actions (functions that run only on the server, callable directly from
Client Components without hand-written API plumbing).

```
app/
├── layout.tsx                 Root HTML shell, theme bootstrap script, global CSS import
├── globals.css                The entire design system (tokens, components, pages)
├── actions.ts                 Server Actions for everything except auth: daily reports,
│                              products, branches, settings, users/RBAC, valuations
├── login/
│   ├── page.tsx               Login screen (glassmorphism card, illustration)
│   ├── LoginForm.tsx           Client form: email/password, remember-me, show/hide
│   └── actions.ts              login() — lockout after 5 bad attempts, session creation
├── api/
│   ├── logout/route.ts         POST — destroys the session cookie
│   ├── products/route.ts       GET — product list for the client-side report wizard
│   └── reports/[type]/
│       ├── excel/route.ts      GET — generates a branded .xlsx for one report type
│       └── pdf/route.ts        GET — generates a branded .pdf for one report type
├── print/[type]/page.tsx       Print-friendly report view (opens in a new tab, auto-prints)
└── (app)/                      Route group: everything behind the authenticated shell
    ├── layout.tsx               Auth guard (redirects if logged out/locked), sidebar,
    │                            topbar, idle-timeout monitor, permission computation
    ├── page.tsx                 Dashboard
    ├── branches/page.tsx        Branch list, health scores, inventory valuation
    ├── products/page.tsx        Product catalogue
    ├── inventory/page.tsx       Warehouse & branch stock value
    ├── finance/page.tsx         Cash / profit & loss / month-over-month
    ├── reports/page.tsx         Excel/PDF/Print export launcher (9 report types)
    ├── reports-daily/page.tsx   Daily report submissions (the WhatsApp replacement)
    ├── users/page.tsx           User Management (roles, permissions, branch access)
    └── settings/page.tsx        Company, logo, currencies, branches, backup, audit log
```

**Adding a new page:** create `app/(app)/<name>/page.tsx` if it needs the authenticated
shell (sidebar/topbar), or `app/<name>/page.tsx` if it's a standalone route like login.
Add its nav entry (with a `module` key) to `components/layout/Sidebar.tsx` if it should
appear in navigation.

**Adding a new mutation:** add a function to `app/actions.ts` (or a domain-specific
`actions.ts` next to the route that owns it, as `login/actions.ts` does) following the
existing pattern: `requireUser()`/`requirePermission()` → mutate via `prisma` → `audit()`
→ `revalidatePath()` → return `{ ok, error?, id? }`.

## `components/` — grouped by business domain, not by type

Every component lives under the feature it belongs to. This is *react components
organized by what they do for the business*, not a generic `forms/`, `buttons/`,
`modals/` split — matching how this codebase has always favored purpose over category.

```
components/
├── shared/          Icon, ToastButton/ToastHost, ChartPrimitives (Spark/AreaChart/
│                    BarChart/Donut), IdleTimeoutMonitor — used across every domain
├── layout/          Sidebar, Topbar, ThemeToggle — the authenticated app chrome
├── branches/        AddBranchForm, EditBranchForm, ValuationForm
├── products/        AddProductForm
├── daily-reports/   NewReportButton, ReportWizard (the multi-step submission flow),
│                    ApproveButton
├── reports/         ReportCard (Excel/PDF/Print launcher tile), AutoPrint
├── users/           AddUserForm, EditUserForm, UsersTable, UserRowActions,
│                    UserDetailModal, PermissionMatrixForm, BranchAssignmentField
└── settings/        SettingsForm, LogoUpload
```

**Adding a new component:** put it in the folder for the domain it serves. If it's
reused across more than one domain (like `Icon` or the chart primitives), it belongs in
`shared/`. Import it via the `@/components/<domain>/<Name>` alias — never a relative
`../../` path, so components can be moved without a cascade of import fixes.

## `lib/` — the "backend" layer

This is where request-independent server logic lives: database access, business rules,
auth/session/permission enforcement, and formatting helpers. Everything here can be
imported from Server Components, Server Actions, and API routes alike.

| File | Purpose |
|---|---|
| `db.ts` | The shared Prisma client singleton |
| `session.ts` | Cookie-based session create/read/destroy, idle-timeout enforcement |
| `permissionTypes.ts` | Pure RBAC constants/types (modules, actions, role defaults) — safe to import from Client Components too, since it has no database dependency |
| `permissions.ts` | Database-backed permission resolution + `requirePermission()`, the auth guard used by every user-management action and page |
| `idleTimeout.ts` | Shared idle-timeout durations (client monitor + server enforcement read the same constants) |
| `settings.ts` | Company settings (name, logo, FX rate, rounding) — a simple key/value store |
| `metrics.ts` | Dashboard and branch-performance calculations |
| `reports.ts` | Data assembly for the 9 exportable report types |
| `docTheme.ts` | Shared brand colors for Excel/PDF/print exports |
| `format.ts` | Money, date, and relative-time formatting |
| `toast.ts` | Lightweight pub/sub used by the toast notification UI |

**Adding new server logic:** if it's a reusable calculation, formatter, or cross-cutting
concern (not a one-off mutation), it belongs in `lib/`, not inlined into a page or
component.

## `database/` — schema, migrations, seed, backups

```
database/
└── prisma/
    ├── schema.prisma    The data model — the single source of truth for the DB shape
    ├── migrations/      Every schema change, in order, auto-generated by Prisma
    └── seed.ts          Idempotent: seeds roles, the admin account, branches, categories
```

The database runs on PostgreSQL (see [`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md)). Back
up using your host's automated backups or `pg_dump` — there is no longer a single file to
copy.

**Changing the schema:** edit `database/prisma/schema.prisma`, then run
`npm run db:migrate` (wraps `prisma migrate dev` with the right `--schema` path).
**Never** edit a file inside `migrations/` by hand.

**Useful commands** (all schema-path-aware, see `package.json`):
`npm run db:seed`, `npm run db:migrate`, `npm run db:generate`, `npm run db:studio`,
`npm run db:reset`.

## Everything else

- `public/` — static files served at the site root (currently just the favicon).
- `next.config.ts`, `tsconfig.json`, `postcss.config.mjs` — framework/build configuration.
  The `@/*` path alias in `tsconfig.json` maps to the project root, so `@/components/...`,
  `@/lib/...`, and `@/app/...` all resolve from anywhere in the codebase.
- `.env` — `DATABASE_URL` (relative to `database/prisma/schema.prisma`) and
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` (read by `database/prisma/seed.ts` when seeding
  the initial administrator account).

## What was removed in this cleanup

- `prototype/` — a static HTML mockup that predated the real application; fully
  superseded and unreferenced by any code.
- `lib/format.ts`'s unused `combinedCdf` helper (dead code left over from an earlier
  dashboard iteration).
- The legacy `prisma/` folder path is gone — everything moved to `database/prisma/`.
