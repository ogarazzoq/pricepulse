# PricePulse — Multi-Marketplace Price Comparison Platform

> Enterprise-grade SaaS platform that aggregates products across multiple marketplaces, tracks price fluctuations over time, and notifies users when prices drop below configured thresholds.

![status](https://img.shields.io/badge/status-production--ready-22c55e)
![license](https://img.shields.io/badge/license-MIT-blue)
![stack](https://img.shields.io/badge/stack-NestJS%20%2B%20Next.js%2015-black)

---

## ✨ Core Capabilities

| Domain | Features |
| --- | --- |
| **Aggregation** | Provider-based marketplace abstraction (FakeStore, DummyJSON), pluggable for Amazon / eBay / Walmart / AliExpress |
| **Search & Compare** | Cross-marketplace product search with normalized schema, side-by-side comparison, stock & rating signals |
| **Price Intelligence** | Historical price tracking, trend analytics (lowest / highest / average / volatility), interactive charts |
| **Smart Alerts** | Threshold-based alerts, scheduled price polling, deduplicated triggers |
| **Notifications** | Multi-channel delivery (Telegram Bot + Email via SMTP) |
| **Jobs** | BullMQ + Redis for periodic price sync, alert evaluation, notification dispatch |
| **Analytics** | Trending products, biggest discounts, cheapest marketplace, recent price drops |
| **Admin** | Marketplace management, queue monitoring, user & alert oversight |

---

## 🏗 Architecture

```
pricepulse/
├── apps/
│   ├── api/                       # NestJS backend (REST API)
│   │   ├── prisma/                # Schema, migrations, seed
│   │   └── src/
│   │       ├── common/            # Filters, guards, decorators, interceptors
│   │       ├── config/            # Typed configuration loaders
│   │       ├── infra/             # Prisma, Redis, Mailer, Telegram clients
│   │       ├── modules/
│   │       │   ├── auth/          # JWT + refresh tokens + RBAC
│   │       │   ├── users/
│   │       │   ├── marketplaces/  # Provider registry & abstraction
│   │       │   ├── products/      # Catalog & search
│   │       │   ├── prices/        # Price history & analytics
│   │       │   ├── alerts/        # Threshold rules & evaluation
│   │       │   ├── notifications/ # Multi-channel dispatch
│   │       │   ├── analytics/     # Aggregated metrics
│   │       │   ├── admin/         # Admin-only endpoints
│   │       │   └── jobs/          # BullMQ producers/consumers
│   │       └── main.ts
│   └── web/                       # Next.js 15 (App Router) frontend
│       └── src/
│           ├── app/               # Routes (landing, dashboard, products, alerts, admin)
│           ├── components/        # UI primitives + composite components
│           ├── features/          # Feature-scoped hooks/services/types
│           ├── lib/               # api client, query client, utils
│           └── styles/
└── packages/
    └── contracts/                 # Shared DTOs & API types
```

### Layering

```
┌──────────────────────────────────────────────────────────────┐
│  Controllers  →  Services  →  Repositories  →  Prisma  → DB  │
│        ↑                ↓                                     │
│   DTO validation   Domain logic                               │
│                        ↓                                      │
│              Queue (BullMQ)  →  Workers  →  Providers ─→ Marketplaces
│                        ↓                                      │
│                  Notifiers (Telegram / Email)                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔌 Marketplace Provider Abstraction

Every external marketplace integration implements the `MarketplaceProvider` interface:

```ts
export interface MarketplaceProvider {
  readonly slug: string;
  readonly displayName: string;
  searchProducts(query: string, opts?: SearchOptions): Promise<NormalizedProduct[]>;
  getProduct(externalId: string): Promise<NormalizedProduct | null>;
  getPrices(externalId: string): Promise<NormalizedPriceQuote>;
}
```

Currently shipped providers: `FakeStoreProvider`, `DummyJsonProvider`. New providers are registered in `MarketplaceRegistry` and become immediately available across search, sync jobs, and alerts.

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 20
- PostgreSQL ≥ 15
- Redis ≥ 7

### Setup

```bash
# 1. Install
npm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Database
npm run db:migrate
npm run db:seed

# 4. Run dev (api on :4000, web on :3000)
npm run dev
```

### Environment

Backend (`apps/api/.env`):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pricepulse
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000
TELEGRAM_BOT_TOKEN=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=PricePulse <noreply@pricepulse.io>
```

Frontend (`apps/web/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## 🧪 API Surface (excerpt)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Create account |
| POST | `/auth/login` | public | Issue access + refresh tokens |
| POST | `/auth/refresh` | public | Rotate tokens |
| GET  | `/products/search?q=` | user | Aggregated marketplace search |
| GET  | `/products/:id` | user | Product detail with offers |
| GET  | `/prices/:productId/history` | user | Time-series price history |
| GET  | `/analytics/overview` | user | Dashboard metrics |
| POST | `/alerts` | user | Create price alert |
| GET  | `/alerts` | user | List my alerts |
| GET  | `/admin/jobs` | admin | Queue insights |

---

## 🎨 Design System

- **Inspiration**: Stripe Dashboard · Vercel · Linear · Notion · TradingView
- **Theme**: Dark/Light with system detection, glassmorphism surfaces, soft shadows
- **Motion**: Framer Motion for page transitions and chart reveals
- **Charts**: Recharts with custom tooltips & gradient fills
- **Components**: shadcn/ui primitives extended with PricePulse tokens

---

## 📊 Database Schema (overview)

`User · Marketplace · Product · ProductOffer · PriceSnapshot · Alert · Notification · RefreshToken · JobLog`

See `apps/api/prisma/schema.prisma` for the canonical definition.

---

## 📜 License

MIT © PricePulse
