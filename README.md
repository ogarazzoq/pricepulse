# PricePulse

**Real-time multi-marketplace price tracking, alerting, and analytics platform.**

PricePulse aggregates product listings from multiple e-commerce providers, stores historical price snapshots, evaluates user-defined alert thresholds, and delivers notifications via email, Telegram bot, and in-app channels — all backed by a monorepo architecture with a NestJS API and a Next.js 15 frontend.

---

## Table of Contents

1. [Live Demo](#live-demo)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Repository Structure](#repository-structure)
5. [Database Schema](#database-schema)
6. [Feature Deep-Dives](#feature-deep-dives)
   - [Authentication](#authentication)
   - [Product Catalog & Price Sync](#product-catalog--price-sync)
   - [Alerts System](#alerts-system)
   - [Notifications](#notifications)
   - [Telegram Bot](#telegram-bot)
   - [Saved Products & Collections](#saved-products--collections)
   - [Analytics Dashboard](#analytics-dashboard)
   - [Admin Console](#admin-console)
   - [Search History](#search-history)
7. [API Reference](#api-reference)
8. [Background Jobs](#background-jobs)
9. [Deployment](#deployment)
10. [Environment Variables](#environment-variables)
11. [Local Development](#local-development)

---

## Live Demo

| Service | URL |
|---------|-----|
| Frontend | https://pricepulse-web-two.vercel.app |
| Backend API | https://pricepulse-api-production.up.railway.app/api/v1 |
| API Docs (Swagger) | https://pricepulse-api-production.up.railway.app/api/v1/docs |
| Telegram Bot | [@newPricePulse_bot](https://t.me/newPricePulse_bot) |

**Demo credentials:**

| Role | Email | Password |
|------|-------|----------|
| Admin | `palonziy@palonziy.palonziy` | `P@l0nziy` |
| Regular user | `demo@pricepulse.io` | `Demo@12345` |

---

## Tech Stack

### Backend (`apps/api`)

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache / Queues | Redis 8 + BullMQ |
| Auth | JWT (access + refresh), Argon2 hashing |
| Email | Nodemailer (SMTP) |
| Telegram | Telegraf 4 |
| Containerization | Docker (Alpine multi-stage) |

### Frontend (`apps/web`)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| UI Components | Radix UI primitives + custom design system |
| State | Zustand (auth), TanStack Query v5 (server state) |
| Charts | Recharts |
| Animations | Framer Motion |
| Deployment | Vercel |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│   Next.js 15 (Vercel)          @newPricePulse_bot (Telegram)    │
│   - App Router (RSC + client)  - Telegraf polling/webhook       │
│   - TanStack Query cache       - Commands & inline keyboards    │
└───────────────────────────────────┬─────────────────────────────┘
                                    │ HTTPS / Webhook
┌───────────────────────────────────▼─────────────────────────────┐
│                        API LAYER  (Railway)                     │
│                                                                 │
│   NestJS 10                                                     │
│   ├── AuthModule      JWT access (15m) + refresh (30d)          │
│   ├── UsersModule     Profile, Telegram linking                 │
│   ├── ProductsModule  Catalog upsert, search, price history     │
│   ├── AlertsModule    CRUD, evaluation logic                    │
│   ├── NotificationsModule  Dispatch (email/telegram/in-app)     │
│   ├── TelegramBotModule   Bot lifecycle + message handlers      │
│   ├── SavedProductsModule  Save/unsave, bulk, export            │
│   ├── CollectionsModule   Organize saved products               │
│   ├── AnalyticsModule     Dashboard overview aggregations       │
│   ├── SearchHistoryModule  Capture + recent/top queries         │
│   ├── MarketplacesModule  Provider registry, sync               │
│   ├── JobsModule          BullMQ queues + processors            │
│   ├── AdminModule         Admin-only endpoints                  │
│   └── BootstrapModule     Idempotent seed on startup            │
└───────┬───────────────────────────────────────────┬─────────────┘
        │ Prisma                                     │ IORedis
┌───────▼───────────┐                   ┌───────────▼─────────────┐
│   PostgreSQL 16   │                   │   Redis 8 (BullMQ)      │
│   (Railway)       │                   │   (Railway)             │
│   - All entities  │                   │   - price-sync queue    │
│   - Price history │                   │   - alert-evaluate q.   │
│   - Notifications │                   │   - notification-disp.  │
└───────────────────┘                   └─────────────────────────┘
```

### Key Design Decisions

**Monorepo** — `apps/api` and `apps/web` share a single `package.json` workspace at the root, enabling unified dependency management while keeping concerns separate.

**Provider abstraction** — Every marketplace connector implements `MarketplaceProvider` interface (`listAll(limit)`, `getBySlug(slug)`). Adding a new marketplace means adding one file; the registry and sync job automatically pick it up.

**Event-driven notifications** — Alert evaluation enqueues `DISPATCH_NOTIFICATION` jobs per channel rather than calling the mailer/Telegram synchronously. This decouples throughput and enables retries.

**Polling vs Webhook (Telegram)** — The bot defaults to webhook mode in production (`TELEGRAM_MODE=webhook`). Polling mode (`TELEGRAM_MODE=polling`) is available for environments without a public HTTPS URL.

**In-memory bot sessions** — Telegraf session data is stored in a `Map` per process. On restart, `getLinkedUser()` re-fetches `telegramChatId` from the DB on every callback, so users never lose state permanently.

---

## Repository Structure

```
pricepulse/
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema (single source of truth)
│   │   │   ├── migrations/         # Prisma migration history
│   │   │   └── seed.ts             # Initial seed (marketplaces + demo users)
│   │   ├── scripts/
│   │   │   └── start.sh            # Production entrypoint (migrate → node dist)
│   │   └── src/
│   │       ├── config/             # NestJS ConfigModule factories
│   │       │   ├── app.config.ts   # PORT, CORS, FRONTEND_URL
│   │       │   ├── jwt.config.ts   # Access/refresh secrets & TTLs
│   │       │   ├── redis.config.ts # Redis URL / host / port
│   │       │   ├── mailer.config.ts
│   │       │   └── telegram.config.ts
│   │       ├── common/
│   │       │   ├── decorators/     # @CurrentUser(), @Public(), @Roles()
│   │       │   ├── guards/         # JwtAuthGuard, RolesGuard
│   │       │   ├── filters/        # AllExceptionsFilter (standard error shape)
│   │       │   └── dto/            # PaginationDto
│   │       ├── infra/
│   │       │   ├── prisma/         # PrismaService (global module)
│   │       │   ├── redis/          # RedisService — IORedis client
│   │       │   ├── mailer/         # MailerService — Nodemailer
│   │       │   └── telegram/       # TelegramService — legacy sendMessage
│   │       └── modules/
│   │           ├── auth/           # Login, register, refresh, logout
│   │           ├── users/          # Profile, Telegram linking endpoints
│   │           ├── products/       # Catalog, upsert, search, price history
│   │           ├── alerts/         # Alert CRUD + evaluation logic
│   │           ├── notifications/  # Dispatch, dedup, listForUser
│   │           ├── telegram-bot/   # Telegraf bot (handlers, messages, context)
│   │           ├── saved-products/ # Save/unsave, bulk ops, CSV export
│   │           ├── collections/    # Folders for saved products
│   │           ├── analytics/      # Dashboard aggregations
│   │           ├── search-history/ # Capture + recent/top queries
│   │           ├── marketplaces/   # Registry, provider list, toggle active
│   │           ├── jobs/           # BullMQ queues + processors
│   │           ├── admin/          # Admin-only CRUD (users, marketplaces, jobs)
│   │           ├── bootstrap/      # Idempotent seed on boot
│   │           └── health/         # GET /health endpoint
│   │
│   └── web/                        # Next.js 15 frontend
│       └── src/
│           ├── app/
│           │   ├── page.tsx                    # Landing page (public)
│           │   ├── (auth)/
│           │   │   ├── login/page.tsx
│           │   │   └── register/page.tsx
│           │   └── (dashboard)/
│           │       ├── layout.tsx              # Auth guard + sidebar + header
│           │       ├── dashboard/page.tsx      # Analytics overview
│           │       ├── products/               # Browse + search
│           │       ├── products/[id]/          # Product detail + price chart
│           │       ├── saved/page.tsx          # Liked products
│           │       ├── collections/            # Collection CRUD + product list
│           │       ├── alerts/page.tsx         # Alert management
│           │       ├── notifications/page.tsx  # Notification history
│           │       ├── analytics/page.tsx      # Advanced analytics
│           │       ├── marketplaces/page.tsx   # Marketplace list
│           │       ├── settings/page.tsx       # Profile + Telegram linking
│           │       └── admin/page.tsx          # Admin console (ADMIN only)
│           ├── components/
│           │   ├── ui/             # Design system (Button, Card, Badge, etc.)
│           │   ├── dashboard/      # Sidebar, Header, StatCard, charts
│           │   ├── products/       # ProductCard, HeartButton, PriceChart
│           │   ├── collections/    # CollectionCard, icons, dialogs
│           │   ├── alerts/         # CreateAlertDialog
│           │   └── landing/        # Hero, stats, testimonials, price preview
│           ├── features/           # Domain-specific API + hooks + types
│           │   ├── auth/
│           │   ├── products/
│           │   ├── alerts/
│           │   ├── saved-products/
│           │   ├── collections/
│           │   ├── notifications/
│           │   ├── analytics/
│           │   └── search-history/
│           └── lib/
│               ├── api-client.ts   # Axios instance with auth interceptors
│               └── utils.ts        # formatCurrency, formatDate, cn()
│
├── Dockerfile                      # Multi-stage: deps → build → runtime
├── .dockerignore
├── .gitignore
├── .prettierrc
└── README.md                       # ← you are here
```

---

## Database Schema

```
User
├── id, email, passwordHash, name, avatarUrl
├── role: USER | ADMIN
├── telegramChatId          (set when Telegram bot is linked)
├── locale: "en" | "uz"    (bot language preference)
├── emailVerifiedAt
│
├── RefreshToken[]          (rotating refresh token pool)
├── Alert[]                 (price alerts)
├── Notification[]          (dispatch history)
├── SavedProduct[]          (liked products)
├── Collection[]            (folders for saved products)
├── SearchHistory[]         (query log for Recent/Top widgets)
└── TelegramVerification[]  (linking codes, expires 15 min)

Product
├── id, slug, title, description, brand, category, imageUrl
├── barcode, mpn           (enriched from UPC Item DB)
├── lowestPrice, highestPrice, averagePrice  (cached aggregates)
├── views
├── ProductOffer[]         (one per marketplace)
└── Alert[]

ProductOffer
├── productId, marketplaceId
├── externalId, externalUrl
├── currentPrice, originalPrice, discountPercent, currency
├── rating, ratingCount, inStock
└── PriceSnapshot[]        (price at point-in-time)

PriceSnapshot
├── productOfferId
├── price, currency, inStock
└── recordedAt

Alert
├── userId, productId, marketplaceId?
├── condition: BELOW | ABOVE | PERCENT_DROP
├── threshold, currency
├── channels: NotificationChannel[]   (EMAIL | TELEGRAM | IN_APP)
├── status: ACTIVE | PAUSED | TRIGGERED | ARCHIVED
├── lastEvaluatedAt, lastTriggeredAt, triggeredCount
└── Notification[]

Notification
├── userId, alertId?
├── channel: EMAIL | TELEGRAM | IN_APP
├── status: PENDING | SENT | FAILED
├── subject, body, metadata (JSON)
├── sentAt, failedAt, errorMessage
└── createdAt

SavedProduct
├── userId, productId, collectionId?
└── createdAt

Collection
├── userId, name, description, color, icon
├── isDefault
└── SavedProduct[]

TelegramVerification
├── userId, chatId, code (6 chars)
├── expiresAt (15 min)
└── usedAt
```

---

## Feature Deep-Dives

### Authentication

**Flow:**

```
POST /auth/register  →  hash password (Argon2)  →  create User
POST /auth/login     →  verify hash  →  issue accessToken (15m JWT) + refreshToken (30d JWT)
                                     →  store RefreshToken hash in DB
POST /auth/refresh   →  verify refresh JWT  →  rotate: invalidate old, issue new pair
POST /auth/logout    →  revoke RefreshToken in DB
```

**Access token** is a short-lived JWT (15 minutes) sent as `Authorization: Bearer <token>`.  
**Refresh token** is a long-lived JWT (30 days) stored in an HTTP-only cookie. On expiry the frontend calls `/auth/refresh` automatically via an Axios response interceptor.

**Guards:**
- `JwtAuthGuard` — global default, all routes protected unless `@Public()` decorator is used
- `RolesGuard` — combined with `@Roles(UserRole.ADMIN)` to restrict admin endpoints

---

### Product Catalog & Price Sync

**Marketplace Providers** live in `apps/api/src/modules/marketplaces/providers/`. Each implements:

```typescript
interface MarketplaceProvider {
  slug: string;
  listAll(limit: number): Promise<NormalizedProduct[]>;
  getBySlug?(slug: string): Promise<NormalizedProduct | null>;
}
```

Current providers: `FakeStore`, `DummyJSON`, `EscuelaJS`, `Open Food Facts`, `BestBuy`.

**Price sync job** runs every 2 hours (configurable via `PRICE_SYNC_CRON`):

```
PriceSyncProcessor.process()
  ├── registry.all()          → active marketplace providers
  ├── provider.listAll(50)    → normalized product array
  ├── ProductsService.upsertNormalizedProduct()
  │   ├── upsert Product (by externalId + marketplaceId)
  │   ├── update ProductOffer (currentPrice, stock, etc.)
  │   └── create PriceSnapshot (immutable record)
  └── log to JobLog table
```

**Search** works via `ProductsService.search(query, filters)` which does a Prisma `contains` on `title` + optional `category` / `marketplace` filters. Every search query is captured in `SearchHistory` for the Recent/Top widgets.

---

### Alerts System

**Creating an alert:**

```
POST /alerts
{
  productId, condition, threshold, currency,
  channels: ["EMAIL", "TELEGRAM", "IN_APP"],
  marketplaceSlug?   // optional: only watch this marketplace
}
```

**Evaluation** runs every 15 minutes via `AlertEvaluateProcessor`:

```
For each ACTIVE alert:
  1. Fetch best ProductOffer (cheapest) for this product (+optional marketplace filter)
  2. Evaluate condition:
     - BELOW:        currentPrice <= threshold
     - ABOVE:        currentPrice >= threshold
     - PERCENT_DROP: (originalPrice - currentPrice) / originalPrice × 100 >= threshold
  3. If triggered:
     a. Enqueue DISPATCH_NOTIFICATION job per channel
     b. Mark alert as TRIGGERED, increment triggeredCount
```

**Alert lifecycle:**

```
ACTIVE → PAUSED    (user pauses)
PAUSED → ACTIVE    (user resumes)
ACTIVE → TRIGGERED (condition met)
* → ARCHIVED       (user deletes — soft delete)
```

---

### Notifications

**Three channels:**

| Channel | How it works |
|---------|-------------|
| `IN_APP` | Stored in `Notification` table, surfaced via `GET /notifications` |
| `EMAIL` | Sent via Nodemailer (SMTP) with HTML template |
| `TELEGRAM` | `bot.telegram.sendMessage(chatId, htmlMessage)` |

**Dispatch pipeline:**

```
AlertEvaluateProcessor
  └── notificationQueue.add('dispatch-notification', payload)
        ↓ (async, BullMQ)
NotificationDispatchProcessor.process(job)
  ├── notifications.dispatch({ userId, alertId, channel, subject, body })
  │   ├── prisma.notification.create(PENDING)
  │   ├── deliver() → mailer | telegram | in_app
  │   └── update status → SENT or FAILED + errorMessage
```

**Deduplication** — `isDuplicate(userId, priceBucketHash, cooldownHours)` checks if a notification with the same `priceBucketHash` metadata was sent within the cooldown window (default 24h), preventing spam.

---

### Telegram Bot

**Bot:** [@newPricePulse_bot](https://t.me/newPricePulse_bot)

**Account Linking Flow:**

```
User (website)                    Backend              User (Telegram)
     │                               │                       │
     │  POST /users/me/telegram/     │                       │
     │  generate-code                │                       │
     │──────────────────────────────►│                       │
     │  { code: "ABC123",            │                       │
     │    expiresAt, expiresIn: 900 }│                       │
     │◄──────────────────────────────│                       │
     │                               │                       │
     │  [Countdown timer shown]      │    /start → "Link Account"
     │                               │◄──────────────────────│
     │                               │    Enter code: ABC123 │
     │                               │◄──────────────────────│
     │                               │                       │
     │  Poll GET /telegram/status ──►│  Verify code          │
     │◄── { isLinked: true }         │  Update telegramChatId│
     │  [Auto-refresh, show Linked]  │                       │
```

**Verification codes** are stored in `TelegramVerification` with a 15-minute TTL. They're one-time use and scoped to a single user.

**Bot screens (via inline keyboards):**

| Screen | Description |
|--------|-------------|
| `/start` | Welcome + Link Account or main menu |
| `/menu` | Main menu (Alerts / Saved / Notifications / Settings / Help) |
| `/alerts` | List alerts with ⏸/▶️/🗑 per-item action buttons + pagination |
| `/saved` | Saved products with prices and website links + pagination |
| `/notifications` | Last 15 notifications with status emoji + timestamp |
| `/settings` | Language picker (EN/UZ) + website links + Unlink |
| `/help` | Command reference + feature list |

**Bilingual support:** All messages exist in both `en` and `uz` in `constants/messages.ts`. The user's language preference is stored in `User.locale` and synced to session on every interaction.

**Webhook vs Polling:**  
Set `TELEGRAM_MODE=webhook` in production and register the URL:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=<API_URL>/api/v1/telegram/webhook
```
Use `TELEGRAM_MODE=polling` for local development (no HTTPS required).

---

### Saved Products & Collections

**Saving a product:**
```
POST /saved  { productId }
→ Idempotent: returns existing record if already saved (HTTP 200)
→ Creates new record (HTTP 201)
```

**Collections** are user-defined folders with a name, color, and icon. Products can be moved between collections. The `/saved?collection=<id>` query filters by collection.

**Bulk operations:** `POST /saved/bulk/save` and `POST /saved/bulk/unsave` accept arrays of up to 50 `productId` values. Each is processed individually and a success/failure report is returned.

**CSV Export:** `GET /saved?format=csv` streams a CSV file of all saved products (title, price, marketplace, URL, saved date).

---

### Analytics Dashboard

`GET /analytics/overview` returns a single aggregated payload powering the entire dashboard:

```json
{
  "totals": {
    "trackedProducts": 1250,
    "activeAlerts": 5,
    "triggeredAlerts30d": 2,
    "averageSavingsPercent": 18.4,
    "savedProducts": 12,
    "searchQueries": 34
  },
  "topDiscounts": [ ...6 offers with highest discountPercent ],
  "recentDrops":  [ ...8 offers where price decreased in last 7 days ],
  "cheapestMarketplaces": [ ...avg price per marketplace ],
  "trending": [ ...6 most-viewed products ]
}
```

**Recent Drops** are computed from `PriceSnapshot` history: price pairs are compared consecutively, and drops are returned sorted by most recent. If no snapshots exist yet, `topDiscounts` (offers with `discountPercent > 0`) are used as a fallback.

---

### Admin Console

Accessible at `/admin` (ADMIN role only). Features:

| Feature | Endpoint |
|---------|----------|
| View all users | `GET /admin/users` |
| Promote/demote user | `PATCH /admin/users/role` |
| List marketplaces | `GET /admin/marketplaces` |
| Add marketplace | `POST /admin/marketplaces` |
| Toggle marketplace active | `PATCH /admin/marketplaces/:id` |
| Delete marketplace | `DELETE /admin/marketplaces/:id` |
| View BullMQ queue stats | `GET /admin/jobs` |
| View recent job logs | `GET /admin/jobs/logs` |
| Manually trigger price sync | `POST /admin/jobs/price-sync/trigger` |
| Manually trigger alert evaluation | `POST /admin/jobs/alerts/trigger` |

**Super-admin** `palonziy@palonziy.palonziy` is always upserted with `ADMIN` role on every application boot via `BootstrapService.ensureSuperAdmin()`.

---

### Search History

Every product search captured with `SearchHistoryService.capture(userId, query)`:
- Normalizes the query (lowercase, trimmed)
- Increments `searchCount` if the same normalized query already exists
- Updates `lastSearchedAt`

**Widgets on dashboard:**
- `GET /searches/recent?limit=5` — last 5 queries by `lastSearchedAt DESC`
- `GET /searches/top?limit=5` — top 5 by `searchCount DESC`

---

## API Reference

Base URL: `/api/v1`  
Swagger UI: `/api/v1/docs` (non-production or `ENABLE_SWAGGER=true`)

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Users | `GET /users/me`, `PATCH /users/me`, `POST /users/me/telegram/generate-code`, `GET /users/me/telegram/status`, `DELETE /users/me/telegram` |
| Products | `GET /products`, `GET /products/:id`, `GET /products/:id/offers`, `GET /products/:id/price-history`, `POST /products/:id/view` |
| Alerts | `GET /alerts`, `POST /alerts`, `GET /alerts/:id`, `PATCH /alerts/:id`, `DELETE /alerts/:id`, `POST /alerts/bulk/pause`, `POST /alerts/bulk/resume`, `POST /alerts/bulk/archive` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `DELETE /notifications/:id` |
| Saved | `GET /saved`, `POST /saved`, `DELETE /saved/:productId`, `GET /saved/count`, `GET /saved/check/:productId`, `POST /saved/bulk/save`, `POST /saved/bulk/unsave` |
| Collections | `GET /collections`, `POST /collections`, `GET /collections/:id`, `PATCH /collections/:id`, `DELETE /collections/:id`, `POST /collections/:id/products`, `DELETE /collections/:id/products/:productId` |
| Analytics | `GET /analytics/overview` |
| Search History | `GET /searches`, `POST /searches`, `GET /searches/recent`, `GET /searches/top`, `DELETE /searches/:id`, `DELETE /searches` |
| Marketplaces | `GET /marketplaces`, `GET /marketplaces/:slug` |
| Telegram | `POST /telegram/webhook`, `GET /telegram/health` |
| Admin | `GET /admin/users`, `PATCH /admin/users/role`, `GET /admin/marketplaces`, `POST /admin/marketplaces`, `PATCH /admin/marketplaces/:id`, `DELETE /admin/marketplaces/:id`, `GET /admin/jobs`, `POST /admin/jobs/price-sync/trigger`, `POST /admin/jobs/alerts/trigger` |
| Health | `GET /health` |

---

## Background Jobs

Three BullMQ queues:

### `price-sync`
- **Trigger:** Cron `0 */2 * * *` (every 2 hours) + admin manual trigger
- **Job:** `price-sync-all`
- **What it does:** Calls every active marketplace provider's `listAll()`, upserts products/offers, records a `PriceSnapshot` for each offer
- **Concurrency:** 2 workers

### `alert-evaluate`
- **Trigger:** Cron `*/15 * * * *` (every 15 minutes) + admin manual trigger
- **Job:** `evaluate-all`
- **What it does:** Fetches all `ACTIVE` alerts, evaluates each against best current offer, enqueues `DISPATCH_NOTIFICATION` if triggered
- **Concurrency:** 4 workers

### `notification-dispatch`
- **Trigger:** Enqueued by `alert-evaluate` worker
- **Job:** `dispatch-notification`
- **What it does:** Calls `NotificationsService.dispatch()` which routes to email, Telegram, or in-app channel
- **Concurrency:** 5 workers

**Job logs** are written to the `JobLog` table and surfaced in the Admin Console.

---

## Deployment

### Infrastructure (Railway)

| Service | Plan | Notes |
|---------|------|-------|
| API (Docker) | Starter | `Dockerfile` at repo root |
| PostgreSQL | Railway Postgres | `DATABASE_URL` auto-injected |
| Redis | Railway Redis | `REDIS_URL` auto-injected |

### CI/CD

Push to `main` → Railway auto-deploys the API (Docker build).  
Push to `main` → Vercel auto-deploys the frontend.

### Production Start Script (`scripts/start.sh`)

```sh
prisma migrate deploy || echo "Migration warning, continuing..."
node dist/main.js
```

Migrations run on every container start (idempotent). The `|| echo` ensures the container boots even if the DB is momentarily unreachable.

### Telegram Webhook Setup

After deploying the API, register the webhook once:

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=<API_URL>/api/v1/telegram/webhook
```

Verify:
```
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

---

## Environment Variables

### Backend (`apps/api/.env`)

```env
# App
NODE_ENV=production
PORT=4000
API_PREFIX=api/v1
CORS_ORIGIN=https://your-frontend.vercel.app

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://default:pass@host:6379

# JWT
JWT_ACCESS_SECRET=<32+ char random string>
JWT_REFRESH_SECRET=<32+ char random string>
JWT_ACCESS_TTL=900          # seconds (15 min)
JWT_REFRESH_TTL=2592000     # seconds (30 days)

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=PricePulse <noreply@pricepulse.io>

# Telegram Bot
TELEGRAM_BOT_TOKEN=<BotFather token>
TELEGRAM_MODE=webhook        # or "polling"
TELEGRAM_WEBHOOK_URL=https://your-api.railway.app/api/v1/telegram/webhook

# Admin bootstrap (optional — creates admin user on boot)
BOOTSTRAP_ADMIN_EMAIL=admin@yourcompany.com
BOOTSTRAP_ADMIN_PASSWORD=SecurePassword123
BOOTSTRAP_ADMIN_NAME=Admin

# Marketplace API keys (optional)
BESTBUY_API_KEY=
RAPIDAPI_KEY=

# Job schedules
PRICE_SYNC_CRON=0 */2 * * *
ALERT_EVALUATE_CRON=*/15 * * * *
```

### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=https://your-api.railway.app/api/v1
```

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 16 running locally (or use Railway)
- Redis running locally (or use Railway via `REDIS_URL`)

### Setup

```bash
# 1. Clone
git clone https://github.com/your-org/pricepulse.git
cd pricepulse

# 2. Install dependencies
npm install

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set DATABASE_URL, JWT secrets, etc.

# 4. Run database migrations
cd apps/api
npx prisma migrate dev
npx prisma generate

# 5. Seed initial data (optional)
npx prisma db seed

# 6. Start API in watch mode
npm run start:dev        # from apps/api/

# 7. Start frontend
npm run dev              # from apps/web/
```

API runs at `http://localhost:4000/api/v1`  
Frontend runs at `http://localhost:3000`

### Running the Telegram Bot Locally

Set `TELEGRAM_MODE=polling` in `apps/api/.env`. The bot will start in long-polling mode automatically when the API boots — no webhook setup required.

---

## About `.kiro`

The `.kiro/` directory contains spec files generated by the [Kiro AI IDE](https://kiro.dev) during development — structured requirement documents and task lists that guided implementation. These files are editor-specific and are excluded from version control via `.gitignore`. They do not affect runtime behavior and are not needed to run or deploy the project.

---

## License

MIT © 2026 PricePulse
