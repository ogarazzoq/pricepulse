# PricePulse — Architecture

## High-level diagram

```
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│   Next.js Frontend  │  ───▶ │   NestJS REST API   │  ───▶ │     PostgreSQL      │
│  (App Router, RQ)   │  ◀─── │  (DTO + Services)   │  ◀─── │   (Prisma schema)   │
└─────────────────────┘       └──────────┬──────────┘       └─────────────────────┘
        ▲                                │
        │ websocket / RQ refetch         ▼
        │                       ┌──────────────────┐         ┌─────────────────────┐
        │                       │   BullMQ Queues  │  ─────▶ │   Workers           │
        │                       │ (Redis-backed)   │         │  • Price Sync       │
        │                       └────────┬─────────┘         │  • Alert Evaluate   │
        │                                ▼                    │  • Notify Dispatch  │
        │                       ┌──────────────────┐         └──────────┬──────────┘
        │                       │  Notifications   │ ◀────────────────  │
        └─ Email / Telegram ──  │   (multi-chan)   │                     │
                                └──────────────────┘                     │
                                                                         ▼
                                                         ┌─────────────────────────┐
                                                         │ Marketplace Providers   │
                                                         │  • FakeStore            │
                                                         │  • DummyJSON            │
                                                         │  • (Amazon, eBay, …)    │
                                                         └─────────────────────────┘
```

## Layered design (backend)

1. **Controller** — HTTP I/O, DTO validation, RBAC.
2. **Service** — domain logic, orchestration.
3. **Repository** — database access (Prisma queries).
4. **Provider / Infra** — external systems (HTTP, SMTP, Telegram, Redis).
5. **Workers** — long-running async work consuming BullMQ jobs.

## Key design decisions

| Decision | Rationale |
| --- | --- |
| Provider-based marketplace abstraction | Swap or add marketplaces with zero changes to controllers/services |
| Normalized `Product` + `ProductOffer` model | Single product can have multiple marketplace offers |
| Price snapshots in dedicated table | Time-series queries remain fast; easy retention policies |
| BullMQ + repeatable jobs | Resilient, distributed, observable scheduled work |
| Argon2 password hashing | Modern KDF, strong defaults |
| Refresh-token rotation w/ DB hash | Detect replay attacks, support mass-revocation |
| Global ValidationPipe + class-validator | Strict, declarative DTO validation |
| Global JwtAuthGuard + `@Public` | Default-secure surface; opt-in public endpoints |
| Global RolesGuard + `@Roles` | Declarative RBAC at controller/method scope |

## Frontend architecture

- **App Router** with route groups: `(auth)` for unauthenticated flows, `(dashboard)` for the authenticated shell.
- **TanStack Query** for data fetching, caching, and background refetch.
- **Zustand** for ephemeral auth state (rehydrated from localStorage).
- **shadcn/ui** primitives extended with PricePulse design tokens (CSS variables in `globals.css`).
- **Recharts** for analytics & price-history visualizations with custom tooltips/gradients.
- **Framer Motion** for hero reveals and section animations on landing page.

## Extending PricePulse

### Adding a new marketplace provider
1. Create `apps/api/src/modules/marketplaces/providers/<slug>.provider.ts` extending `MarketplaceProvider`.
2. Register in `MarketplaceRegistry` constructor.
3. Add a row to seed data with the provider's slug and metadata.

### Adding a new notification channel
1. Add the channel to the `NotificationChannel` Prisma enum.
2. Add a new infra service (e.g., `discord.service.ts`).
3. Extend `NotificationsService.deliver` switch.
