# PricePulse — Production Deployment

This guide takes you from a working local repo to a fully deployed production stack:

- **Backend + Postgres + Redis** → Railway
- **Frontend** → Vercel

Total time end-to-end: ~15 minutes.

---

## Architecture overview

```
                       ┌──────────────────┐
        users ────▶    │   Vercel (web)   │
                       └────────┬─────────┘
                                │ HTTPS (NEXT_PUBLIC_API_URL)
                                ▼
                       ┌──────────────────┐
                       │ Railway: API     │  (Dockerfile, prisma migrate deploy on boot)
                       │  (Nest + BullMQ) │
                       └─┬────────────┬───┘
                         │            │
                         ▼            ▼
                ┌────────────┐  ┌───────────┐
                │ Postgres   │  │  Redis    │  (Railway plugins)
                └────────────┘  └───────────┘
```

---

## 0. Prerequisites

You need these accounts:

- GitHub: `https://github.com/ogarazzoq/pricepulse`
- Railway: https://railway.app/ (sign in with GitHub)
- Vercel: https://vercel.com/ (sign in with GitHub)

**Push the repo first.** From your project root:

```bash
git add .
git commit -m "feat: production-ready deploy artifacts"
git push origin main
```

---

## 1. Provision Railway services

Open https://railway.app/dashboard → **New Project** → **Deploy from GitHub repo** → pick `ogarazzoq/pricepulse`.

You will create three services in this single project: **api**, **postgres**, **redis**.

### 1a. Postgres

In your project, click **+ Create** → **Database** → **PostgreSQL**.
Railway provisions it and exposes:

- `DATABASE_URL` (auto-generated)
- internal hostnames usable from siblings in the same project

### 1b. Redis

Click **+ Create** → **Database** → **Redis**.
This exposes `REDIS_URL`.

### 1c. API service

The first deploy of `pricepulse` is your API. Configure it:

1. Go to the **api** service → **Settings** → **Source**:
   - **Root directory**: leave empty (build context = repo root)
   - **Watch paths**: `apps/api/**`, `Dockerfile`, `prisma/**`
2. **Settings → Build**:
   - **Builder**: Dockerfile
   - **Dockerfile path**: `Dockerfile`
3. **Settings → Networking → Generate domain** (or attach a custom domain).
   Save the URL — e.g. `https://pricepulse-api-production.up.railway.app`.
4. **Settings → Healthcheck**:
   - Path: `/api/v1/health`
   - Timeout: 30s

### 1d. Environment variables (api service)

In the api service → **Variables** tab, set:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `API_PREFIX` | `api/v1` |
| `DATABASE_URL` | reference: `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | reference: `${{Redis.REDIS_URL}}` |
| `JWT_ACCESS_SECRET` | run `openssl rand -hex 32` and paste |
| `JWT_REFRESH_SECRET` | run `openssl rand -hex 32` and paste |
| `JWT_ACCESS_TTL` | `900` |
| `JWT_REFRESH_TTL` | `2592000` |
| `CORS_ORIGIN` | `https://your-vercel-domain.vercel.app` (set after step 2) |
| `PRICE_SYNC_CRON` | `0 */2 * * *` |
| `ALERT_EVALUATE_CRON` | `*/15 * * * *` |
| `TELEGRAM_BOT_TOKEN` | (optional — leave empty for dry-run mode) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | (optional) |

To reference variables across services, click the **+** on the value field and pick the variable from another service.

> **Important:** in the variable inputs, you can use Railway’s reference syntax `${{Postgres.DATABASE_URL}}` and `${{Redis.REDIS_URL}}` so secrets stay synced if Railway rotates them.

### 1e. Trigger first deploy

Push a commit, or click **Deploy** on the api service. The build will:

1. Build the Docker image from `Dockerfile`
2. Run `prisma migrate deploy` on container start (creates all tables)
3. Boot Nest on port 4000
4. Healthcheck hits `/api/v1/health` → expects `{ "status": "healthy" }`

### 1f. Seed (one-time)

The seed inserts default marketplaces and the demo accounts. Two options:

**Option A — Railway shell (recommended):**

```bash
railway link            # pick the api service
railway run npx prisma db seed
```

**Option B — One-shot deploy variable:**

Set `RUN_SEED=true` and modify the start command (manual). For most cases, option A is cleaner.

After seeding you can log in with:

- `admin@pricepulse.io / Admin@12345`
- `demo@pricepulse.io / Demo@12345`

> **Change those passwords immediately in production.**

---

## 2. Provision Vercel frontend

1. Go to https://vercel.com/new → **Import Git Repository** → pick `pricepulse`.
2. **Framework preset**: Next.js
3. **Root Directory**: `apps/web`  ← critical, monorepo
4. **Build & Output Settings**: leave defaults (Vercel reads `apps/web/vercel.json`)
5. **Environment Variables**:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<your-railway-api-domain>/api/v1` |

6. Click **Deploy**.

Vercel will build the Next.js app (≈45s) and give you a URL like `https://pricepulse-ogarazzoq.vercel.app`.

### 2a. Update CORS on Railway

Go back to Railway → api service → **Variables** → set:

```
CORS_ORIGIN=https://pricepulse-ogarazzoq.vercel.app
```

Railway redeploys automatically on env change.

To allow Vercel preview URLs (each PR gets one), use a comma-separated list:

```
CORS_ORIGIN=https://pricepulse-ogarazzoq.vercel.app,https://pricepulse-git-main-ogarazzoq.vercel.app
```

---

## 3. Smoke test

```bash
# 1. Health
curl https://<your-railway-api-domain>/api/v1/health
# → {"status":"healthy","checks":{"api":"ok","database":"ok","redis":"ok"}}

# 2. Login
curl -X POST https://<your-railway-api-domain>/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@pricepulse.io","password":"Demo@12345"}'

# 3. Open the frontend
open https://<your-vercel-domain>.vercel.app
```

Sign in, run **Admin → Run price sync now** (admin account), then explore products.

---

## 4. Operational notes

### BullMQ workers
Workers run in the same Nest process as the API. This is fine for the MVP. To scale separately:

1. Create a second Railway service from the same Dockerfile.
2. Add env var `WORKER_ONLY=true` (and split the bootstrap to skip listening — left as a v2 enhancement).
3. Scale this worker service horizontally.

### Migrations
Every container start runs `prisma migrate deploy`, which applies any unapplied migrations. For schema changes:

```bash
# Local
npm --workspace @pricepulse/api run prisma:migrate -- --name <change-name>
git add apps/api/prisma/migrations
git commit -m "db: <change>"
git push
```

Railway redeploys → migration applies automatically.

### Logs
- Railway: project → service → **Deployments** → click any deploy → **Logs**
- Vercel: project → **Logs** tab (Functions + Edge)

### Common errors

| Symptom | Cause | Fix |
| --- | --- | --- |
| `CORS: origin ... not allowed` | Frontend domain not in `CORS_ORIGIN` | Add to Railway env, redeploy |
| `Invalid environment configuration` on boot | Missing required env var | Read the printed list, set the missing var |
| `The table public.User does not exist` | Migrations haven’t run | Verify start command runs `prisma migrate deploy`; check Railway logs |
| Frontend shows demo data only | Catalog not seeded | Run admin → price sync, or seed: `railway run npx prisma db seed` |
| Redis ECONNREFUSED | `REDIS_URL` not set or pointing to localhost | Reference `${{Redis.REDIS_URL}}` in api service vars |

---

## 5. Cost (Railway free tier as of 2025)

- $5/month free credit covers the API + Postgres + Redis for an MVP-grade workload.
- Vercel Hobby tier: free for non-commercial.

---

## 6. Going further

- **Custom domain**: Railway → service → Settings → Custom Domain. Vercel → Project → Settings → Domains.
- **Sentry / log drain**: Railway has a built-in Datadog integration; Sentry SDK in Nest is a 5-minute add.
- **Read replicas**: Railway Postgres supports read replicas. Add a `DATABASE_REPLICA_URL` env and use it in the analytics service.
