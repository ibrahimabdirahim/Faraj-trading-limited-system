# Render Deployment Guide

## 1. Create the Postgres database

In the Render dashboard: **New → PostgreSQL**. Pick a region close to your users. Once
created, copy its **Internal Database URL** (use the internal one if your web service is
also on Render — it's faster and doesn't leave Render's network).

## 2. Create the web service

**New → Web Service**, connect this repository.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Start command | `npm run start` |
| Pre-deploy / release command | `npx prisma migrate deploy --schema=database/prisma/schema.prisma` |
| Health check path | `/api/health` |
| Instance type | Whatever fits your traffic — this app has no special CPU/memory requirements |

If your Render plan doesn't support a separate pre-deploy command, run
`npm run setup` once manually after the first deploy instead (see step 4).

## 3. Required environment variables

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | The Postgres connection string from step 1 | Required |
| `ADMIN_EMAIL` | The email for the initial admin account | Only read during `npm run setup`/seeding |
| `ADMIN_PASSWORD` | The password for the initial admin account | Only read during seeding — change it via Settings immediately after first login |
| `SESSION_SECRET` | A long random string | Generate one with `openssl rand -base64 32`; **do not reuse the local dev value** |
| `NODE_ENV` | `production` | Render sets this automatically — no action needed |
| `PORT` | — | Render sets this automatically; `next start` already reads it — no action needed |

None of these should ever be committed — `.env` is gitignored, and `.env.example` documents
the shape with placeholders only.

## 4. First deploy

1. Push this branch to trigger the first deploy.
2. If you have existing data to bring over (branches, users, historical reports), run the
   data migration script from your local machine, pointed at the new Render Postgres URL:
   ```bash
   DATABASE_URL="<render-postgres-external-url>" SQLITE_PATH="./database/prisma/dev.db" \
     npx tsx scripts/migrate-sqlite-to-postgres.ts
   ```
   (Use the **External** Database URL for this — your local machine isn't on Render's
   internal network.) Skip this step if you're starting fresh.
3. If you skipped the data migration (fresh start) or want the seeded admin account either
   way, run once: `npm run setup` (this is safe to run again later — it's idempotent).
4. Visit the deployed URL, sign in with `ADMIN_EMAIL`/`ADMIN_PASSWORD`, and change the
   password immediately via Settings → My Account.

## 5. Production deployment checklist

- [ ] Render Postgres instance created
- [ ] `DATABASE_URL` set to the Render Postgres connection string
- [ ] `SESSION_SECRET` set to a fresh random value (not the local dev placeholder)
- [ ] `ADMIN_EMAIL` / `ADMIN_PASSWORD` set to real values you control
- [ ] Build command: `npm run build`
- [ ] Start command: `npm run start`
- [ ] Migration step (`prisma migrate deploy`) runs before the app starts, on every deploy
- [ ] Health check path set to `/api/health`
- [ ] Existing data migrated (if applicable) via `scripts/migrate-sqlite-to-postgres.ts`
- [ ] Logged in as the seeded admin and changed the password
- [ ] Confirmed real Daily Report submission, PDF/Excel export, and search all work against
      the live Render deployment (not just locally)
- [ ] Old local `dev.db` kept as a backup until the above is confirmed, not deleted immediately

## Rolling back

If something goes wrong after cutover, the old `database/prisma/dev.db` file and the archived
SQLite migrations (`database/prisma/migrations_sqlite_archive/`) are both still on disk,
untouched. Reverting `schema.prisma`'s datasource to `sqlite` and restoring the migrations
folder from the archive returns the app to exactly its pre-migration state.
