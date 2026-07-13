# Faraj OS — Business Operating System

A modern, admin-first business management platform for **Faraj Trading Limited**
(wholesale & retail distribution, 6+ branches, dual-currency CDF / USD).

This is the **interactive front-end prototype** — a single self-contained HTML file
with no build step and no dependencies.

## Run it

Open `index.html` in any modern browser. That's it — no install, no server.

## What's inside

Single file: `index.html` (HTML + CSS + vanilla JS, ~78 KB).

Modules (left sidebar):

1. **Dashboard** — report-submission status, dual-currency KPI tiles (cash / expenses /
   profit / inventory in both CDF & USD), cash-flow & branch charts, business-intelligence
   panel, branch-health leaderboard, activity feed, AI daily summary.
2. **Daily Reports** — 5-step wizard to transcribe each branch's evening WhatsApp report
   (branch → stock received → cash CDF+USD → expenses → review & lock). Starts empty.
3. **Products** — catalogue with base cost per item. Starts empty (Import Excel / Add).
4. **Inventory** — warehouse & branch stock, valuations, movement history.
5. **Branches** — Luilu 1, Luilu 2, Lumundu, Mipeto 1, Mipeto 2, KWM; health scores,
   ranking, weekly & monthly inventory valuation.
6. **Finance** — cash, P&L, month-vs-previous comparison.
7. **Reports** — generate/export Daily, Weekly, Monthly, Yearly, Branch, Inventory,
   Cash, Expense, Profit reports (Excel / PDF / Print).
8. **Settings** — company, branches, users, currencies (live CDF↔USD rate), roles,
   backup, audit logs.

Also: dark / light theme toggle, toast notifications, responsive layout.

## Design notes

- **Dual currency everywhere** — CDF and USD are always tracked separately, never
  auto-mixed. A manual exchange rate (Settings → Currencies) is used only for combined
  dashboard estimates.
- **Admin-only** — only the General Administrator uses the system; employees don't log in.
  The architecture leaves room for branch logins later without restructuring.
- Palette: petrol/jade brand accent with separate semantic colors (green / amber / rose).

## Status

Front-end prototype with mock/sample data on the dashboard-side pages. Products and
Daily Reports lists start empty. No data is persisted yet — nothing is saved between
page reloads.

## Roadmap (next)

- Decide profit model (units-sold vs reported-cash-minus-expenses).
- Language (English / French / bilingual).
- Turn into a real deployable app (e.g. Next.js + database) with persistence & auth.
