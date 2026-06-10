# Design Document: PricePulse Engagement Suite

## Overview

The PricePulse Engagement Suite transforms the existing passive price comparison platform into an engagement-driven product by adding five major feature areas:

1. **Saved Products** — Heart/save functionality with full-stack persistence
2. **Search History** — Automatic capture with deduplication and per-user capping
3. **Enhanced Product Details** — SEO-friendly slug routes with rich metadata
4. **Improved Price Alerts** — Quick-create UI with full lifecycle management
5. **Robust Email Notifications** — Reliable pipeline with deduplication and retry logic

This design builds on the existing NestJS API and Next.js 15 App Router frontend, adding two new Prisma models (`SavedProduct`, `SearchHistory`) while extending existing modules (`alerts`, `notifications`). All changes are **additive** — no existing functionality is removed or replaced.

### Design Goals

- **Clean Architecture**: Follow existing patterns (module separation, DTOs, guards, services)
- **Maintainability**: Clear separation of concerns, consistent naming, comprehensive error handling
- **Production-Ready**: Proper indexing, pagination, ownership enforcement, resilience
- **Accessibility**: WCAG 2.1 AA compliance for all UI components
- **Performance**: Sub-200ms p95 latency for CRUD operations, bounded payloads

### Key Constraints

- Preserve all existing functionality (auth, RBAC, throttling, swagger, queue monitoring)
- Use existing `Alert` model (no parallel `PriceAlert` model)
- Maintain existing BullMQ queues (`price-sync`, `alert-evaluate`, `notification-dispatch`)
- Support dry-run mode for Mailer when SMTP env vars are unset
- Deploy to Railway (API) and Vercel (Web)

---

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                                 │
└────────────┬────────────────────────────────────┬───────────┘
             │                                     │
             ▼                                     ▼
    ┌────────────────┐                   ┌────────────────┐
    │   Web Client   │                   │  Email Client  │
    │  (Next.js 15)  │                   │  (Nodemailer)  │
    │   @ Vercel     │                   └────────┬───────┘
    └────────┬───────┘                            │
             │                                     │
             │ HTTPS/JWT                          │ SMTP
             ▼                                     │
    ┌────────────────────────────────────────────┴───────────┐
    │            NestJS API @ Railway                         │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
    │  │  Saved   │  │  Search  │  │  Alerts  │            │
    │  │ Products │  │ History  │  │ (extend) │            │
    │  └──────────┘  └──────────┘  └──────────┘            │
    │                                                         │
    │  ┌──────────────────────────────────────────────┐    │
    │  │         BullMQ Workers                        │    │
    │  │  • price-sync                                 │    │
    │  │  • alert-evaluate                             │    │
    │  │  • notification-dispatch (extended)           │    │
    │  └──────────────────────────────────────────────┘    │
    └────────┬───────────────────────┬──────────────────────┘
             │                       │
             ▼                       ▼
    ┌────────────────┐      ┌────────────────┐
    │   PostgreSQL   │      │     Redis      │
    │    (Prisma)    │      │   (BullMQ)     │
    └────────────────┘      └────────────────┘
```

### Module Structure

The suite introduces two new API modules and extends one existing module:

**New Modules:**
- `saved-products` — Owns `SavedProduct` table, endpoints, DTOs
- `search-history` — Owns `SearchHistory` table, endpoints, DTOs, cap enforcement

**Extended Modules:**
- `alerts` — Enhanced with quick-create support, status transitions (ACTIVE↔PAUSED)
- `notifications` — Extended with email-specific metadata, dedup guard, retry tracking

**Infrastructure (unchanged):**
- `prisma` — Connection pooling, transaction support
- `redis` — BullMQ backing store
- `mailer` — Nodemailer wrapper with dry-run mode
- `common` — Guards (JWT), decorators (@CurrentUser), DTOs (Pagination)

### Data Flow: Saved Products

```
User clicks ❤️ button
       │
       ▼
Web optimistic update → POST /api/v1/saved
       │                         │
       │                         ▼
       │                SavedProductsService
       │                         │
       │                         ▼
       │                Upsert (idempotent)
       │                         │
       │                         ▼
       └─────────────────► Invalidate cache
                                 │
                                 ▼
                          Badge/UI updates
```

### Data Flow: Search History

```
User submits search
       │
       ▼
Web coalescing logic (5s window)
       │
       ▼
POST /api/v1/searches
       │
       ▼
SearchHistoryService.capture()
       │
       ├─► Normalize query
       ├─► Check per-user cap
       ├─► Evict oldest if at cap
       └─► Upsert with searchCount++
```

### Data Flow: Email Notifications

```
Price changes
       │
       ▼
Price-Sync Worker → enqueue alert-evaluate
                            │
                            ▼
                    Alert-Evaluate Worker
                            │
                            ├─► AlertsService.evaluate()
                            ├─► Condition met?
                            └─► Enqueue notification-dispatch
                                        │
                                        ▼
                            Notification-Dispatch Worker
                                        │
                                        ├─► Dedup guard check
                                        ├─► Render email template
                                        ├─► MailerService.send()
                                        └─► Update Notification status
                                                │
                                                ├─ Success → SENT
                                                └─ Failure → FAILED (retry)
```

---

## Components and Interfaces

### Backend: Saved Products Module

**Location:** `apps/api/src/modules/saved-products/`

#### File Structure
```
saved-products/
├── saved-products.module.ts
├── saved-products.controller.ts
├── saved-products.service.ts
└── dto/
    ├── create-saved-product.dto.ts
    └── saved-product-list.dto.ts
```

#### API Endpoints

| Method | Path | Auth | Purpose | Response |
|--------|------|------|---------|----------|
| GET | `/api/v1/saved` | JWT | List user's saved products | `{ items[], total, page, pageSize }` |
| POST | `/api/v1/saved` | JWT | Save a product (idempotent) | `SavedProduct` (201/200) |
| DELETE | `/api/v1/saved/:productId` | JWT | Unsave a product | 204 (no-op if not saved) |
| GET | `/api/v1/saved/count` | JWT | Count user's saves | `{ count: number }` |
| GET | `/api/v1/saved/check/:productId` | JWT | Check if product is saved | `{ saved: boolean }` |

#### SavedProductsService Interface

```typescript
interface SavedProductsService {
  // Create or return existing (idempotent)
  create(userId: string, productId: string): Promise<SavedProductDto>;
  
  // List with pagination
  list(userId: string, page: number, pageSize: number): Promise<PaginatedResponse<SavedProductDto>>;
  
  // Delete (no-op if not found)
  remove(userId: string, productId: string): Promise<void>;
  
  // Count
  count(userId: string): Promise<number>;
  
  // Check existence
  check(userId: string, productId: string): Promise<boolean>;
}
```

#### DTOs

**CreateSavedProductDto**
```typescript
class CreateSavedProductDto {
  @IsString()
  @IsNotEmpty()
  productId: string;
}
```

**SavedProductDto (response)**
```typescript
interface SavedProductDto {
  id: string;
  userId: string;
  productId: string;
  product: {
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
    lowestPrice: number | null;
    currency: string;
    marketplaceCount: number;
  };
  createdAt: string;
}
```

---

### Backend: Search History Module

**Location:** `apps/api/src/modules/search-history/`

#### File Structure
```
search-history/
├── search-history.module.ts
├── search-history.controller.ts
├── search-history.service.ts
├── search-history.utils.ts
└── dto/
    ├── capture-search.dto.ts
    └── search-history-list.dto.ts
```

#### API Endpoints

| Method | Path | Auth | Purpose | Response |
|--------|------|------|---------|----------|
| POST | `/api/v1/searches` | JWT | Capture a search | `SearchHistoryDto` |
| GET | `/api/v1/searches` | JWT | List searches (paginated) | `{ items[], total, page, pageSize }` |
| GET | `/api/v1/searches/recent` | JWT | Recent searches | `SearchHistoryDto[]` |
| GET | `/api/v1/searches/top` | JWT | Most-frequent searches | `SearchHistoryDto[]` |
| DELETE | `/api/v1/searches/:id` | JWT | Delete a search | 204 |
| DELETE | `/api/v1/searches` | JWT | Clear all searches | 204 |

#### SearchHistoryService Interface

```typescript
interface SearchHistoryService {
  // Capture (upsert with increment or create)
  capture(userId: string, query: string): Promise<SearchHistoryDto>;
  
  // List with pagination
  list(userId: string, page: number, pageSize: number): Promise<PaginatedResponse<SearchHistoryDto>>;
  
  // Recent (ordered by lastSearchedAt desc)
  getRecent(userId: string, limit: number): Promise<SearchHistoryDto[]>;
  
  // Top (ordered by searchCount desc, lastSearchedAt desc)
  getTop(userId: string, limit: number): Promise<SearchHistoryDto[]>;
  
  // Delete one
  remove(userId: string, id: string): Promise<void>;
  
  // Clear all
  clearAll(userId: string): Promise<void>;
}
```

#### Normalization Logic

**Location:** `apps/api/src/modules/search-history/search-history.utils.ts`

```typescript
export function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // Collapse whitespace runs to single space
}
```

#### Per-User Cap Enforcement

The `capture()` method implements the cap logic:

1. Count existing rows for user
2. If at cap (default 100):
   - Find oldest entry: `ORDER BY lastSearchedAt ASC, id ASC LIMIT 1`
   - Delete it within the same transaction
3. Upsert the new/updated search

```typescript
async capture(userId: string, query: string): Promise<SearchHistoryDto> {
  const normalized = normalizeQuery(query);
  const cap = this.getCap(); // From env, clamped 10..1000
  
  return await this.prisma.$transaction(async (tx) => {
    const count = await tx.searchHistory.count({ where: { userId } });
    
    if (count >= cap) {
      // Evict oldest
      const oldest = await tx.searchHistory.findFirst({
        where: { userId },
        orderBy: [{ lastSearchedAt: 'asc' }, { id: 'asc' }],
      });
      if (oldest) {
        await tx.searchHistory.delete({ where: { id: oldest.id } });
      }
    }
    
    // Upsert
    const entry = await tx.searchHistory.upsert({
      where: { userId_normalizedQuery: { userId, normalizedQuery: normalized } },
      create: {
        userId,
        query,
        normalizedQuery: normalized,
        searchCount: 1,
        lastSearchedAt: new Date(),
      },
      update: {
        query, // Update to latest casing
        searchCount: { increment: 1 },
        lastSearchedAt: new Date(),
      },
    });
    
    return this.serialize(entry);
  });
}
```

---

### Backend: Enhanced Alerts Module

**Location:** `apps/api/src/modules/alerts/` (existing, extended)

#### Changes

**No schema changes** — the existing `Alert` model is sufficient.

**Service Extensions:**

1. **Status Transitions:**
   - `update()` method supports `status` field (ACTIVE/PAUSED)
   - When setting PAUSED, evaluator skips the alert
   - When reactivating, preserves `triggeredCount` and `lastTriggeredAt`

2. **Soft Delete:**
   - `archive()` method sets `status = ARCHIVED`
   - Evaluator skips ARCHIVED alerts
   - No physical deletion

3. **IDOR Prevention:**
   - All operations filter by `userId` AND alert `id`
   - Return 404 if not found or not owned

**Updated AlertsService Interface:**

```typescript
interface AlertsService {
  create(userId: string, dto: CreateAlertDto): Promise<AlertDto>;
  listByUser(userId: string): Promise<AlertDto[]>;
  
  // Extended for partial updates
  update(userId: string, id: string, dto: UpdateAlertDto): Promise<AlertDto>;
  
  // Soft delete
  archive(userId: string, id: string): Promise<void>;
  
  // Evaluation (used by worker)
  evaluate(alert: Alert): Promise<TriggerMetadata | null>;
  markTriggered(alertId: string): Promise<void>;
}
```

**UpdateAlertDto (extended):**

```typescript
class UpdateAlertDto {
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0.01)
  @Max(999_999_999.99)
  threshold?: Decimal;
  
  @IsOptional()
  @IsEnum(AlertCondition)
  condition?: AlertCondition;
  
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @ArrayMinSize(1)
  @ArrayUnique()
  channels?: NotificationChannel[];
  
  @IsOptional()
  @IsEnum(['ACTIVE', 'PAUSED']) // Only allow these transitions
  status?: 'ACTIVE' | 'PAUSED';
}
```

---

### Backend: Notifications Module (Extended)

**Location:** `apps/api/src/modules/notifications/` (existing, extended)

#### Changes

**Schema Extension:**

The existing `Notification` model already has a `metadata` JSON field. We extend its schema to include:

```typescript
interface NotificationMetadata {
  // Email-specific fields
  offerId?: string;
  marketplaceSlug?: string;
  oldPrice?: number;
  newPrice?: number;
  threshold?: number;
  condition?: string;
  priceBucketHash?: string;
  
  // Status tracking
  retryCount?: number;
  deduped?: boolean;
  dryRun?: boolean;
}
```

**NotificationsService Extensions:**

```typescript
interface NotificationsService {
  // Existing
  create(data: CreateNotificationDto): Promise<Notification>;
  listByUser(userId: string, filters: NotificationFilters): Promise<PaginatedResponse<Notification>>;
  
  // New: Dedup check
  isDuplicate(
    userId: string,
    priceBucketHash: string,
    cooldownHours: number
  ): Promise<boolean>;
  
  // New: Update retry count
  incrementRetry(notificationId: string): Promise<void>;
}
```

**Dedup Guard Implementation:**

```typescript
async isDuplicate(
  userId: string,
  priceBucketHash: string,
  cooldownHours: number
): Promise<boolean> {
  const cutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
  
  const existing = await this.prisma.notification.findFirst({
    where: {
      userId,
      createdAt: { gte: cutoff },
      metadata: {
        path: ['priceBucketHash'],
        equals: priceBucketHash,
      },
    },
    timeout: 2000,
  });
  
  return !!existing;
}
```

**Price Bucket Hash Computation:**

```typescript
import { createHash } from 'crypto';

function computePriceBucketHash(
  alertId: string,
  offerId: string,
  condition: string,
  threshold: number,
  currentPrice: number
): string {
  const priceRounded = Math.round(currentPrice * 100) / 100;
  const payload = `${alertId}:${offerId}:${condition}:${threshold}:${priceRounded}`;
  return createHash('sha256').update(payload).digest('hex').substring(0, 16);
}
```

---

### Backend: BullMQ Workers (Extended)

#### Notification-Dispatch Worker

**Location:** `apps/api/src/modules/jobs/workers/notification-dispatch.worker.ts`

**Configuration:**

```typescript
const notificationDispatchQueue = new Queue('notification-dispatch', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s, 40s, 80s
    },
    removeOnComplete: {
      age: 86400, // 24 hours
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});
```

**Worker Logic:**

```typescript
@Processor('notification-dispatch')
export class NotificationDispatchWorker {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly mailer: MailerService,
    private readonly prisma: PrismaService,
    private readonly logger: Logger
  ) {}
  
  @Process()
  async handle(job: Job<NotificationDispatchPayload>) {
    const { notificationId } = job.data;
    const attemptNumber = job.attemptsMade + 1;
    
    this.logger.info(`Dispatching notification ${notificationId}, attempt ${attemptNumber}`);
    
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
        include: { user: true, alert: { include: { product: true } } },
      });
      
      if (!notification) {
        this.logger.warn(`Notification ${notificationId} not found, skipping`);
        return;
      }
      
      // Dedup guard
      const metadata = notification.metadata as NotificationMetadata;
      if (metadata.priceBucketHash) {
        const cooldownHours = this.getCooldownHours();
        const isDupe = await this.notifications.isDuplicate(
          notification.userId,
          metadata.priceBucketHash,
          cooldownHours
        );
        
        if (isDupe) {
          this.logger.info(`Skipping duplicate email for ${notificationId}`);
          await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              metadata: { ...metadata, deduped: true },
            },
          });
          return;
        }
      }
      
      // Send email
      if (notification.channel === 'EMAIL') {
        await this.sendEmail(notification);
      }
      // Handle other channels (TELEGRAM, IN_APP) here
      
      // Mark sent
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          metadata: { ...metadata, retryCount: attemptNumber },
        },
      });
      
      // Log success
      await this.prisma.jobLog.create({
        data: {
          queue: 'notification-dispatch',
          jobName: 'dispatch',
          status: 'COMPLETED',
          payload: { notificationId },
          result: { status: 'SENT', attemptNumber },
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      });
      
    } catch (error) {
      this.logger.error(`Notification dispatch failed: ${error.message}`, error.stack);
      
      // Update notification
      const metadata = (notification?.metadata as NotificationMetadata) || {};
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: attemptNumber >= 5 ? 'FAILED' : 'PENDING',
          failedAt: attemptNumber >= 5 ? new Date() : null,
          errorMessage: error.message.substring(0, 1000),
          metadata: { ...metadata, retryCount: attemptNumber },
        },
      });
      
      // Log failure
      await this.prisma.jobLog.create({
        data: {
          queue: 'notification-dispatch',
          jobName: 'dispatch',
          status: attemptNumber >= 5 ? 'FAILED' : 'RUNNING',
          payload: { notificationId },
          errorMessage: error.message.substring(0, 1000),
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      });
      
      // Re-throw for BullMQ retry
      throw error;
    }
  }
  
  private async sendEmail(notification: Notification & { user: User; alert: Alert & { product: Product } }) {
    const metadata = notification.metadata as NotificationMetadata;
    const product = notification.alert.product;
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    const productUrl = `${appUrl}/products/${product.slug}`;
    
    const emailData = {
      to: notification.user.email,
      subject: notification.subject,
      template: 'price-drop',
      context: {
        productTitle: product.title,
        productImage: product.imageUrl,
        oldPrice: metadata.oldPrice,
        newPrice: metadata.newPrice,
        savings: metadata.oldPrice - metadata.newPrice,
        savingsPercent: ((metadata.oldPrice - metadata.newPrice) / metadata.oldPrice * 100).toFixed(1),
        currency: notification.alert.currency,
        marketplaceName: metadata.marketplaceSlug, // TODO: resolve to name
        productUrl,
      },
    };
    
    await this.mailer.sendMail(emailData);
  }
  
  private getCooldownHours(): number {
    const env = process.env.ALERT_EMAIL_COOLDOWN_HOURS;
    if (!env) return 24;
    const parsed = parseInt(env, 10);
    if (isNaN(parsed)) {
      this.logger.warn(`Invalid ALERT_EMAIL_COOLDOWN_HOURS: ${env}, using 24`);
      return 24;
    }
    return Math.max(1, Math.min(168, parsed));
  }
}
```

---

### Frontend: Architecture

**Tech Stack:**
- Next.js 15 (App Router)
- React Query v5 (data fetching, caching)
- Zustand (client state for auth)
- Sonner (toast notifications)
- Radix UI (accessible primitives)
- Tailwind CSS (styling)

**Directory Structure:**

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── products/
│   │   │   ├── [id]/          # Legacy, redirects to slug
│   │   │   └── [slug]/        # Canonical product detail
│   │   ├── saved/             # NEW
│   │   ├── searches/          # NEW
│   │   ├── alerts/
│   │   └── notifications/
│   └── layout.tsx
├── components/
│   ├── products/
│   │   ├── heart-button.tsx           # NEW
│   │   ├── product-card.tsx
│   │   ├── offer-comparison.tsx
│   │   └── price-alert-quick-create.tsx  # NEW
│   ├── search/
│   │   ├── recent-searches-widget.tsx    # NEW
│   │   └── top-searches-widget.tsx       # NEW
│   ├── ui/                    # Radix primitives
│   └── layout/
│       └── sidebar.tsx        # Extended with badge
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── saved-products.ts     # NEW
│   │   ├── search-history.ts     # NEW
│   │   ├── alerts.ts
│   │   └── products.ts
│   ├── hooks/
│   │   ├── use-saved-products.ts # NEW
│   │   ├── use-search-history.ts # NEW
│   │   └── use-auth.ts
│   └── stores/
│       └── auth-store.ts
└── types/
    ├── saved-product.ts          # NEW
    ├── search-history.ts         # NEW
    └── alert.ts
```

---

### Frontend: Heart Button Component

**Location:** `apps/web/src/components/products/heart-button.tsx`

```typescript
'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavedProduct } from '@/lib/hooks/use-saved-products';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';

interface HeartButtonProps {
  productId: string;
  productTitle?: string;
  variant?: 'default' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function HeartButton({
  productId,
  productTitle = 'this product',
  variant = 'ghost',
  size = 'md',
}: HeartButtonProps) {
  const { user } = useAuth();
  const { isSaved, save, unsave, isPending } = useSavedProduct(productId);
  
  const handleToggle = async () => {
    if (!user) return;
    
    if (isSaved) {
      await unsave();
    } else {
      await save();
    }
  };
  
  const ariaLabel = !user
    ? 'Sign in to save products'
    : isSaved
    ? `Remove ${productTitle} from saved`
    : `Save ${productTitle}`;
  
  const iconClass = cn(
    'transition-all',
    isSaved && 'fill-red-500 text-red-500',
    !isSaved && 'text-gray-500'
  );
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-11 w-11',  // 44px for touch target
    lg: 'h-12 w-12',
  };
  
  return (
    <Button
      variant={variant}
      size="icon"
      className={sizeClasses[size]}
      onClick={handleToggle}
      disabled={!user || isPending}
      aria-pressed={isSaved}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Heart className={iconClass} size={size === 'sm' ? 16 : 20} />
    </Button>
  );
}
```

---

### Frontend: React Query Hooks

**Location:** `apps/web/src/lib/hooks/use-saved-products.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSavedProducts,
  savePro
duct,
  unsaveProduct,
  checkSavedProduct,
  getSavedCount,
} from '@/lib/api/saved-products';

export function useSavedProduct(productId: string) {
  const queryClient = useQueryClient();
  
  // Check if product is saved
  const { data: checkData } = useQuery({
    queryKey: ['saved', productId],
    queryFn: () => checkSavedProduct(productId),
    enabled: !!productId,
  });
  
  const isSaved = checkData?.saved ?? false;
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => saveProduct(productId),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['saved', productId] });
      await queryClient.cancelQueries({ queryKey: ['saved', 'count'] });
      
      const previousCheck = queryClient.getQueryData(['saved', productId]);
      const previousCount = queryClient.getQueryData<{ count: number }>(['saved', 'count']);
      
      queryClient.setQueryData(['saved', productId], { saved: true });
      if (previousCount) {
        queryClient.setQueryData(['saved', 'count'], { count: previousCount.count + 1 });
      }
      
      return { previousCheck, previousCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previousCheck) {
        queryClient.setQueryData(['saved', productId], context.previousCheck);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['saved', 'count'], context.previousCount);
      }
      toast.error('Failed to save product. Changes have been reverted.');
    },
  });
  
  // Unsave mutation
  const unsaveMutation = useMutation({
    mutationFn: () => unsaveProduct(productId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['saved', productId] });
      await queryClient.cancelQueries({ queryKey: ['saved', 'count'] });
      
      const previousCheck = queryClient.getQueryData(['saved', productId]);
      const previousCount = queryClient.getQueryData<{ count: number }>(['saved', 'count']);
      
      queryClient.setQueryData(['saved', productId], { saved: false });
      if (previousCount && previousCount.count > 0) {
        queryClient.setQueryData(['saved', 'count'], { count: previousCount.count - 1 });
      }
      
      return { previousCheck, previousCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
    onError: (error, variables, context) => {
      if (context?.previousCheck) {
        queryClient.setQueryData(['saved', productId], context.previousCheck);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['saved', 'count'], context.previousCount);
      }
      toast.error('Failed to unsave product. Changes have been reverted.');
    },
  });
  
  return {
    isSaved,
    save: saveMutation.mutate,
    unsave: unsaveMutation.mutate,
    isPending: saveMutation.isPending || unsaveMutation.isPending,
  };
}

// Hook for listing saved products (with pagination)
export function useSavedProducts(page = 1, pageSize = 24) {
  return useQuery({
    queryKey: ['saved', { page, pageSize }],
    queryFn: () => getSavedProducts(page, pageSize),
  });
}

// Hook for saved count
export function useSavedCount() {
  return useQuery({
    queryKey: ['saved', 'count'],
    queryFn: getSavedCount,
  });
}
```

**Location:** `apps/web/src/lib/hooks/use-search-history.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  captureSearch,
  getSearches,
  getRecentSearches,
  getTopSearches,
  deleteSearch,
  clearAllSearches,
} from '@/lib/api/search-history';

// Coalescing hook: only submit once per 5 seconds
export function useSearchCapture() {
  const queryClient = useQueryClient();
  const lastSubmitRef = useRef<Map<string, number>>(new Map());
  
  const mutation = useMutation({
    mutationFn: captureSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches'] });
    },
    onError: () => {
      // Silent failure for search history
    },
  });
  
  const capture = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed.length > 256) return;
    
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
    const now = Date.now();
    const lastSubmit = lastSubmitRef.current.get(normalized);
    
    if (lastSubmit && now - lastSubmit < 5000) {
      return; // Skip within 5-second window
    }
    
    lastSubmitRef.current.set(normalized, now);
    mutation.mutate(trimmed);
  }, [mutation]);
  
  return { capture };
}

export function useSearchHistory(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['searches', { page, pageSize }],
    queryFn: () => getSearches(page, pageSize),
  });
}

export function useRecentSearches(limit = 5) {
  return useQuery({
    queryKey: ['searches', 'recent', limit],
    queryFn: () => getRecentSearches(limit),
  });
}

export function useTopSearches(limit = 5) {
  return useQuery({
    queryKey: ['searches', 'top', limit],
    queryFn: () => getTopSearches(limit),
  });
}

export function useDeleteSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches'] });
    },
  });
}

export function useClearSearches() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearAllSearches,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches'] });
      toast.success('Search history cleared');
    },
  });
}
```

---

## Data Models

### Database Schema Extensions

**New Prisma Models:**

```prisma
model SavedProduct {
  id        String   @id @default(cuid())
  userId    String
  productId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
  @@index([userId])
}

model SearchHistory {
  id              String   @id @default(cuid())
  userId          String
  query           String   @db.VarChar(256)
  normalizedQuery String   @db.VarChar(256)
  searchCount     Int      @default(1)
  lastSearchedAt  DateTime
  createdAt       DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, normalizedQuery])
  @@index([userId])
  @@index([userId, lastSearchedAt])
}
```

**Schema Changes to Existing Models:**

```prisma
// User model — add relations
model User {
  // ... existing fields ...
  savedProducts SavedProduct[]
  searchHistory SearchHistory[]
}

// Product model — add relation
model Product {
  // ... existing fields ...
  savedBy SavedProduct[]
}
```

### Migration Strategy

**Migration File:** `apps/api/prisma/migrations/YYYYMMDD_add_engagement_models/migration.sql`

```sql
-- Create SavedProduct table
CREATE TABLE "SavedProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "SavedProduct_userId_fkey" FOREIGN KEY ("userId") 
        REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "SavedProduct_productId_fkey" FOREIGN KEY ("productId") 
        REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "SavedProduct_userId_productId_key" 
    ON "SavedProduct"("userId", "productId");
CREATE INDEX "SavedProduct_userId_idx" 
    ON "SavedProduct"("userId");

-- Create SearchHistory table
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "query" VARCHAR(256) NOT NULL,
    "normalizedQuery" VARCHAR(256) NOT NULL,
    "searchCount" INTEGER NOT NULL DEFAULT 1,
    "lastSearchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") 
        REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "SearchHistory_userId_normalizedQuery_key" 
    ON "SearchHistory"("userId", "normalizedQuery");
CREATE INDEX "SearchHistory_userId_idx" 
    ON "SearchHistory"("userId");
CREATE INDEX "SearchHistory_userId_lastSearchedAt_idx" 
    ON "SearchHistory"("userId", "lastSearchedAt");
```

### Indexing Strategy

| Table | Index | Purpose | Query Pattern |
|-------|-------|---------|---------------|
| SavedProduct | `(userId, productId)` UNIQUE | Deduplication, fast upserts | `WHERE userId = ? AND productId = ?` |
| SavedProduct | `userId` | List user's saves | `WHERE userId = ? ORDER BY createdAt DESC` |
| SearchHistory | `(userId, normalizedQuery)` UNIQUE | Deduplication, increment searchCount | `WHERE userId = ? AND normalizedQuery = ?` |
| SearchHistory | `userId` | List all searches | `WHERE userId = ? ORDER BY lastSearchedAt DESC` |
| SearchHistory | `(userId, lastSearchedAt)` | Fast eviction on cap | `WHERE userId = ? ORDER BY lastSearchedAt ASC LIMIT 1` |

---

## Error Handling

### Backend Error Hierarchy

```typescript
// Custom exceptions
class ProductNotFoundException extends NotFoundException {
  constructor(productId: string) {
    super(`Product with ID ${productId} not found`);
  }
}

class AlertNotFoundException extends NotFoundException {
  constructor(alertId: string) {
    super(`Alert with ID ${alertId} not found or not owned by you`);
  }
}

class SearchHistoryCapacityExceededException extends BadRequestException {
  constructor() {
    super('Search history capacity exceeded and eviction failed');
  }
}
```

### Error Response Format

All API errors follow the NestJS standard format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

For validation errors with class-validator:

```json
{
  "statusCode": 400,
  "message": [
    "productId must be a string",
    "productId should not be empty"
  ],
  "error": "Bad Request"
}
```

### Frontend Error Handling

**Network Errors:**
```typescript
// In React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 60_000, // 1 minute
    },
    mutations: {
      retry: false, // No automatic retry for mutations
    },
  },
});
```

**Auth Errors (401):**
```typescript
// In API client interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const originalRequest = error.config;
      
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          await refreshAccessToken();
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect
          clearTokens();
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);
```

**User-Facing Error Messages:**

| Error Type | Toast Message | Duration |
|------------|---------------|----------|
| Network timeout | "Request timed out. Please try again." | 5s |
| 401 Unauthorized | (Silent redirect to /login) | N/A |
| 403 Forbidden | "You don't have permission to do that." | 5s |
| 404 Not Found | "Item not found." | 5s |
| 400 Validation | (Inline validation errors) | N/A |
| 500 Server Error | "Something went wrong. Please try again later." | 7s |
| Optimistic rollback | "Action failed. Changes have been reverted." | 5s |

---

## Testing Strategy

### Overview

The PricePulse Engagement Suite requires a comprehensive testing approach combining:

1. **Unit Tests** — Business logic, utilities, service methods
2. **Property-Based Tests** — Universal properties across input spaces
3. **Integration Tests** — API endpoints, database transactions, BullMQ workers
4. **E2E Tests** — Critical user flows (save product, create alert, receive email)

### Property-Based Testing Assessment

**PBT IS Appropriate** for this feature because:

- The codebase contains **pure business logic** with clear input/output behavior:
  - Search query normalization (idempotence, deduplication)
  - Saved products idempotence (save twice = save once)
  - Price bucket hash computation (deterministic)
  - Pagination clamping logic
  - Alert status transitions
  
- The feature has **universal properties** that should hold across wide input spaces:
  - Normalization is idempotent: `normalize(normalize(s)) === normalize(s)`
  - Saved products cap: `count(SavedProduct WHERE userId=u) ∈ {0,1}` per product
  - Search history cap invariant: `count <= MAX_PER_USER` after every operation
  - Email deduplication within cooldown window
  
- The input space is **large and varied**:
  - Search queries: Unicode strings, whitespace patterns, special characters
  - Product IDs: Valid/invalid CUIDs
  - Prices: Decimals with varying precision
  - Timestamps: Date ranges for cooldown logic

**PBT Is NOT Appropriate** for:

- UI rendering (use snapshot tests instead)
- BullMQ job scheduling (use integration tests with test queues)
- SMTP delivery (use mock-based unit tests)
- Next.js routing (use E2E tests)

### Testing Library Selection

**Property-Based Testing:** [fast-check](https://github.com/dubzzz/fast-check)
- Mature TypeScript/JavaScript PBT library
- Built-in arbitraries for common types
- Configurable shrinking for minimal counterexamples
- Integrates with Jest/Vitest

**Unit/Integration:** Jest (API), Vitest (Web)

**E2E:** Playwright

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

#### Property Reflection Analysis

After analyzing all acceptance criteria, I identified the following testable properties. Through reflection, I consolidated redundant properties:

**Consolidations Made:**
- Properties 1.5 and 1.6 (invalid product ID and validation) combine into Property 2 (input validation)
- Properties 2.8 and 2.9 (count and check consistency) combine into Property 3 (consistency across operations)
- Properties 1.8 and 1.9 (cascade deletes) combine into Property 4 (referential integrity)
- Properties 16.3, 16.4, and 16.8 (email dedup) combine into Property 10 (deduplication correctness)

**Final Property Set (11 properties):**

### Property 1: Saved Products Idempotence

*For any* authenticated user and any valid product ID, calling the save operation twice SHALL result in exactly one SavedProduct row, with the `createdAt` timestamp equal to the first save operation's timestamp.

**Validates: Requirements 1.4, 2.5**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.record({ userId: fc.uuid(), productId: fc.uuid() }),
    async ({ userId, productId }) => {
      // Arrange: Create product
      await createTestProduct(productId);
      
      // Act: Save twice
      const first = await savedProductsService.create(userId, productId);
      const second = await savedProductsService.create(userId, productId);
      
      // Assert
      const count = await prisma.savedProduct.count({
        where: { userId, productId }
      });
      
      expect(count).toBe(1);
      expect(first.createdAt).toBe(second.createdAt);
      expect(second.id).toBe(first.id);
    }
  ),
  { numRuns: 100 }
);
```

---

### Property 2: Saved Products Input Validation

*For any* authenticated user and any invalid product reference (non-existent ID, missing field, empty string, non-string type), the save operation SHALL reject the request with HTTP 400 or 404 and SHALL NOT create any SavedProduct row.

**Validates: Requirements 1.5, 1.6**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.oneof(
      fc.constant(undefined),           // Missing
      fc.constant(''),                  // Empty
      fc.constant(null),                // Null
      fc.integer(),                     // Wrong type
      fc.uuid().filter(id => !existingProductIds.includes(id))  // Non-existent
    ),
    async (invalidProductId) => {
      const userId = testUser.id;
      
      const countBefore = await prisma.savedProduct.count({ where: { userId } });
      
      await expect(
        savedProductsService.create(userId, invalidProductId as any)
      ).rejects.toThrow();
      
      const countAfter = await prisma.savedProduct.count({ where: { userId } });
      expect(countAfter).toBe(countBefore);
    }
  ),
  { numRuns: 100 }
);
```

---

### Property 3: Saved Products Consistency

*For any* authenticated user and any sequence of save/unsave operations, the `GET /saved/count` endpoint SHALL return a count exactly equal to the number of distinct productIds currently saved by that user, and `GET /saved/check/:productId` SHALL return `true` if and only if that product is in the saved set.

**Validates: Requirements 2.6, 2.8, 2.9**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.array(
      fc.record({
        productId: fc.uuid(),
        operation: fc.constantFrom('save', 'unsave')
      }),
      { minLength: 1, maxLength: 20 }
    ),
    async (operations) => {
      const userId = testUser.id;
      const savedSet = new Set<string>();
      
      // Apply operations
      for (const { productId, operation } of operations) {
        await createTestProduct(productId);
        if (operation === 'save') {
          await savedProductsService.create(userId, productId);
          savedSet.add(productId);
        } else {
          await savedProductsService.remove(userId, productId);
          savedSet.delete(productId);
        }
      }
      
      // Assert count
      const { count } = await savedProductsService.count(userId);
      expect(count).toBe(savedSet.size);
      
      // Assert check for all products
      for (const productId of operations.map(o => o.productId)) {
        const { saved } = await savedProductsService.check(userId, productId);
        expect(saved).toBe(savedSet.has(productId));
      }
    }
  ),
  { numRuns: 100 }
);
```

---

### Property 4: Saved Products Referential Integrity

*For any* user with N saved products, deleting that user SHALL cascade-delete all N SavedProduct rows (final count = 0). Similarly, for any product saved by M users, deleting that product SHALL cascade-delete all M SavedProduct rows.

**Validates: Requirements 1.8, 1.9**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.record({
      userCount: fc.integer({ min: 1, max: 5 }),
      productsPerUser: fc.integer({ min: 1, max: 10 })
    }),
    async ({ userCount, productsPerUser }) => {
      // Create users and products
      const users = await Promise.all(
        Array.from({ length: userCount }, () => createTestUser())
      );
      const products = await Promise.all(
        Array.from({ length: productsPerUser }, () => createTestProduct())
      );
      
      // Each user saves all products
      for (const user of users) {
        for (const product of products) {
          await savedProductsService.create(user.id, product.id);
        }
      }
      
      const initialCount = await prisma.savedProduct.count();
      expect(initialCount).toBe(userCount * productsPerUser);
      
      // Delete first user
      await prisma.user.delete({ where: { id: users[0].id } });
      const afterUserDelete = await prisma.savedProduct.count();
      expect(afterUserDelete).toBe((userCount - 1) * productsPerUser);
      
      // Delete first product
      await prisma.product.delete({ where: { id: products[0].id } });
      const afterProductDelete = await prisma.savedProduct.count();
      expect(afterProductDelete).toBe((userCount - 1) * (productsPerUser - 1));
    }
  ),
  { numRuns: 50 }
);
```

---

### Property 5: Pagination Clamping and Defaulting

*For any* pagination parameters (page, pageSize) provided to list endpoints, if pageSize > 100 it SHALL be clamped to 100, and if page < 1 or pageSize < 1 or non-integer values are provided, defaults (page=1, pageSize=20) SHALL be substituted. The response SHALL never contain more than min(pageSize, 100) items.

**Validates: Requirements 2.2, 2.3, 2.4, 21.1, 21.2**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.record({
      page: fc.oneof(fc.integer(), fc.double(), fc.constant('invalid')),
      pageSize: fc.oneof(fc.integer(), fc.double(), fc.constant('invalid'))
    }),
    async ({ page, pageSize }) => {
      const userId = testUser.id;
      
      // Create 150 saved products
      for (let i = 0; i < 150; i++) {
        const product = await createTestProduct();
        await savedProductsService.create(userId, product.id);
      }
      
      const response = await request(app)
        .get('/api/v1/saved')
        .query({ page, pageSize })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.body.items.length).toBeLessThanOrEqual(100);
      expect(response.body.page).toBeGreaterThanOrEqual(1);
      expect(response.body.pageSize).toBeGreaterThanOrEqual(1);
      expect(response.body.pageSize).toBeLessThanOrEqual(100);
    }
  ),
  { numRuns: 100 }
);
```

---

### Property 6: Search Query Normalization Idempotence

*For any* string input, the normalization function SHALL be idempotent: `normalize(normalize(s)) === normalize(s)`. Additionally, any two queries that normalize to the same value SHALL map to the same SearchHistory row.

**Validates: Requirements 6.3, 6.6**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.string({ minLength: 2, maxLength: 256 }),
    async (query) => {
      const normalized1 = normalizeQuery(query);
      const normalized2 = normalizeQuery(normalized1);
      
      expect(normalized2).toBe(normalized1);
    }
  ),
  { numRuns: 200 }
);

// Deduplication property
fc.assert(
  fc.property(
    fc.tuple(
      fc.string({ minLength: 2, maxLength: 256 }),
      fc.string({ minLength: 2, maxLength: 256 })
    ).filter(([q1, q2]) => normalizeQuery(q1) === normalizeQuery(q2)),
    async ([query1, query2]) => {
      const userId = testUser.id;
      
      // Capture both
      await searchHistoryService.capture(userId, query1);
      await searchHistoryService.capture(userId, query2);
      
      // Should be only 1 row with searchCount=2
      const entries = await prisma.searchHistory.findMany({
        where: { userId, normalizedQuery: normalizeQuery(query1) }
      });
      
      expect(entries.length).toBe(1);
      expect(entries[0].searchCount).toBe(2);
    }
  ),
  { numRuns: 100 }
);
```

---

### Property 7: Search History Per-User Cap Invariant

*For any* authenticated user and any sequence of search capture operations, the total count of SearchHistory rows for that user SHALL never exceed the configured cap (default 100). When a new search is captured for a user at cap, the oldest entry (by `lastSearchedAt`, then by `id`) SHALL be evicted.

**Validates: Requirements 7.1, 7.2**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.record({
      cap: fc.integer({ min: 10, max: 100 }),
      searchCount: fc.integer({ min: 95, max: 120 })
    }),
    async ({ cap, searchCount }) => {
      const userId = testUser.id;
      
      // Configure cap
      process.env.SEARCH_HISTORY_MAX_PER_USER = String(cap);
      
      // Generate unique queries
      const queries = Array.from(
        { length: searchCount },
        (_, i) => `query ${i} ${Math.random()}`
      );
      
      // Capture all
      for (const query of queries) {
        await searchHistoryService.capture(userId, query);
        
        const count = await prisma.searchHistory.count({ where: { userId } });
        expect(count).toBeLessThanOrEqual(cap);
      }
      
      // Final count should equal min(searchCount, cap)
      const finalCount = await prisma.searchHistory.count({ where: { userId } });
      expect(finalCount).toBe(Math.min(searchCount, cap));
      
      // If over cap, verify oldest entries were evicted
      if (searchCount > cap) {
        const remaining = await prisma.searchHistory.findMany({
          where: { userId },
          orderBy: [{ lastSearchedAt: 'asc' }]
        });
        
        // Most recent entries should be present
        const expectedQueries = queries.slice(-cap);
        for (const query of expectedQueries) {
          const found = remaining.some(r => r.query === query);
          expect(found).toBe(true);
        }
      }
    }
  ),
  { numRuns: 50 }
);
```

---

### Property 8: Search History Configuration Clamping

*For any* value of `SEARCH_HISTORY_MAX_PER_USER` environment variable, the service SHALL clamp it to the range [10, 1000]. Values below 10 SHALL become 10, values above 1000 SHALL become 1000, and non-parseable values SHALL default to 100.

**Validates: Requirements 7.3, 7.4**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.oneof(
      fc.integer({ min: -100, max: 5 }),     // Below min
      fc.integer({ min: 1001, max: 10000 }), // Above max
      fc.integer({ min: 10, max: 1000 }),    // Valid range
      fc.constant('invalid'),                // Non-parseable
      fc.constant(undefined)                 // Unset
    ),
    (envValue) => {
      process.env.SEARCH_HISTORY_MAX_PER_USER = envValue as any;
      
      const cap = searchHistoryService['getCap']();
      
      if (envValue === undefined || envValue === 'invalid') {
        expect(cap).toBe(100); // Default
      } else if (typeof envValue === 'number') {
        if (envValue < 10) {
          expect(cap).toBe(10);
        } else if (envValue > 1000) {
          expect(cap).toBe(1000);
        } else {
          expect(cap).toBe(envValue);
        }
      }
    }
  ),
  { numRuns: 100 }
);
```

---

### Property 9: Alert Status Transition Preservation

*For any* alert with existing `triggeredCount` and `lastTriggeredAt` values, a PATCH operation that only updates the `status` field SHALL preserve those counter fields unchanged.

**Validates: Requirements 13.3, 13.6**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.record({
      initialStatus: fc.constantFrom('ACTIVE', 'PAUSED', 'TRIGGERED'),
      triggeredCount: fc.integer({ min: 0, max: 100 }),
      targetStatus: fc.constantFrom('ACTIVE', 'PAUSED')
    }),
    async ({ initialStatus, triggeredCount, targetStatus }) => {
      const alert = await createTestAlert({
        userId: testUser.id,
        status: initialStatus,
        triggeredCount,
        lastTriggeredAt: new Date()
      });
      
      const beforeUpdate = await prisma.alert.findUnique({
        where: { id: alert.id }
      });
      
      // Update only status
      await alertsService.update(testUser.id, alert.id, {
        status: targetStatus
      });
      
      const afterUpdate = await prisma.alert.findUnique({
        where: { id: alert.id }
      });
      
      expect(afterUpdate.status).toBe(targetStatus);
      expect(afterUpdate.triggeredCount).toBe(beforeUpdate.triggeredCount);
      expect(afterUpdate.lastTriggeredAt).toEqual(beforeUpdate.lastTriggeredAt);
    }
  ),
  { numRuns: 100 }
);
```

---

### Property 10: Email Deduplication Within Cooldown

*For any* alert evaluation that produces a price bucket hash, if another notification with the same hash exists for the same user within the cooldown window (default 24 hours), the system SHALL NOT send a new email and SHALL mark the notification as deduped. Conversely, notifications with different hashes SHALL be sent independently.

**Validates: Requirements 16.3, 16.4, 16.8**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.record({
      alertId: fc.uuid(),
      offerId: fc.uuid(),
      condition: fc.constantFrom('BELOW', 'ABOVE'),
      threshold: fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
      price1: fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
      price2: fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
      hoursApart: fc.double({ min: 0.1, max: 48 })
    }),
    async ({ alertId, offerId, condition, threshold, price1, price2, hoursApart }) => {
      const userId = testUser.id;
      const cooldownHours = 24;
      
      // Compute hashes
      const hash1 = computePriceBucketHash(alertId, offerId, condition, threshold, price1);
      const hash2 = computePriceBucketHash(alertId, offerId, condition, threshold, price2);
      
      // Create first notification
      const notif1 = await prisma.notification.create({
        data: {
          userId,
          alertId,
          channel: 'EMAIL',
          subject: 'Test',
          body: 'Test',
          status: 'SENT',
          sentAt: new Date(),
          metadata: { priceBucketHash: hash1 }
        }
      });
      
      // Create second notification after time offset
      const secondTime = new Date(notif1.createdAt.getTime() + hoursApart * 60 * 60 * 1000);
      
      const isDupe = await notificationsService.isDuplicate(
        userId,
        hash1,
        cooldownHours
      );
      
      if (hoursApart < cooldownHours) {
        expect(isDupe).toBe(true); // Within window, should be duplicate
      } else {
        expect(isDupe).toBe(false); // Outside window, not a duplicate
      }
      
      // Different hash should never be duplicate
      const isDifferent = await notificationsService.isDuplicate(
        userId,
        hash2,
        cooldownHours
      );
      
      if (hash1 !== hash2) {
        expect(isDifferent).toBe(false); // Different hash = independent
      }
    }
  ),
  { numRuns: 100 }
);
```

---

### Property 11: Price Bucket Hash Determinism

*For any* given tuple of (alertId, offerId, condition, threshold, price rounded to 2 decimals), the hash computation SHALL produce the same output across multiple invocations and SHALL be stable across process restarts.

**Validates: Requirements 16.1**

**Test Approach:**
```typescript
fc.assert(
  fc.property(
    fc.record({
      alertId: fc.uuid(),
      offerId: fc.uuid(),
      condition: fc.constantFrom('BELOW', 'ABOVE', 'PERCENT_DROP'),
      threshold: fc.double({ min: 0.01, max: 999999.99, noNaN: true }),
      price: fc.double({ min: 0.01, max: 999999.99, noNaN: true })
    }),
    ({ alertId, offerId, condition, threshold, price }) => {
      const hash1 = computePriceBucketHash(alertId, offerId, condition, threshold, price);
      const hash2 = computePriceBucketHash(alertId, offerId, condition, threshold, price);
      const hash3 = computePriceBucketHash(alertId, offerId, condition, threshold, price);
      
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
      
      // Verify hash is a 16-character hex string
      expect(hash1).toMatch(/^[0-9a-f]{16}$/);
    }
  ),
  { numRuns: 200 }
);
```

---

## Security and Ownership

### Authentication

All new endpoints use the existing JWT authentication strategy:

```typescript
@Controller('saved')
@UseGuards(JwtAuthGuard)  // Applied at controller level
export class SavedProductsController {
  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.sub, page, pageSize);
  }
}
```

**JWT Payload:**
```typescript
interface JwtPayload {
  sub: string;      // userId
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
```

### Ownership Enforcement

**Principle:** User A MUST NOT be able to access or modify User B's data.

**Implementation Pattern:**

```typescript
// ❌ WRONG: Accepts userId from request
async list(userId: string) {
  return this.prisma.savedProduct.findMany({ where: { userId } });
}

// ✅ CORRECT: Extracts userId from JWT
async list(@CurrentUser() user: JwtPayload) {
  const userId = user.sub;  // Always from JWT, never from request
  return this.prisma.savedProduct.findMany({ where: { userId } });
}
```

**IDOR Prevention:**

```typescript
// Mutation example: Update alert
async update(userId: string, alertId: string, dto: UpdateAlertDto) {
  // First check: Does this alert exist AND belong to this user?
  const alert = await this.prisma.alert.findFirst({
    where: { id: alertId, userId }  // Both conditions required
  });
  
  if (!alert) {
    // Don't reveal whether alert exists
    throw new NotFoundException('Alert not found');
  }
  
  return this.prisma.alert.update({
    where: { id: alertId },
    data: dto
  });
}
```

### Rate Limiting

All new endpoints inherit the global throttle configuration:

```typescript
// From app.module.ts
ThrottlerModule.forRoot([{
  ttl: 60_000,  // 60 seconds
  limit: 120    // 120 requests per minute
}])
```

**Per-endpoint overrides** (if needed):

```typescript
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('searches')
async capture() {
  // More restrictive: 10/minute for search capture
}
```

### Input Validation

All DTOs use `class-validator` decorators:

```typescript
class CreateSavedProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  productId: string;
}

class CaptureSearchDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(256)
  query: string;
}

class UpdateAlertDto {
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0.01)
  @Max(999_999_999.99)
  threshold?: number;
  
  @IsOptional()
  @IsEnum(AlertStatus, { 
    message: 'Status must be ACTIVE or PAUSED',
    each: false 
  })
  @IsIn(['ACTIVE', 'PAUSED'])  // Only allow these transitions
  status?: 'ACTIVE' | 'PAUSED';
}
```

### SQL Injection Prevention

Prisma provides automatic parameterization. All queries use Prisma Client:

```typescript
// ✅ Safe: Prisma handles parameterization
await prisma.savedProduct.findMany({
  where: { userId, productId }
});

// ❌ Never use raw SQL with user input
await prisma.$queryRaw`SELECT * FROM SavedProduct WHERE userId = ${userId}`;
```

### XSS Prevention

**Backend:**
- All responses are JSON (Content-Type: application/json)
- No HTML rendering on API side

**Frontend:**
- React automatically escapes values in JSX
- Use `dangerouslySetInnerHTML` only for sanitized Markdown (via `DOMPurify`)
- CSP headers configured in Next.js

**Email Templates:**
- Use template engines with auto-escaping (Handlebars)
- Product titles and marketplace names are escaped before rendering

---

## Performance Considerations

### Database Indexing

**Query Performance Targets:**
- p50: < 50ms
- p95: < 200ms
- p99: < 500ms

**Index Coverage:**

| Query | Index Used | Cardinality |
|-------|-----------|-------------|
| List saved products | `SavedProduct(userId)` | 1:N (avg ~10) |
| Check if saved | `SavedProduct(userId, productId)` UNIQUE | 1:1 |
| List searches | `SearchHistory(userId, lastSearchedAt)` | 1:N (capped at 100) |
| Find oldest search | `SearchHistory(userId, lastSearchedAt)` | Scan 1 row |

**Query Optimization:**

```sql
-- ✅ GOOD: Uses covering index
SELECT id, query, searchCount, lastSearchedAt
FROM SearchHistory
WHERE userId = ?
ORDER BY lastSearchedAt DESC
LIMIT 20;

-- Uses: SearchHistory(userId, lastSearchedAt)
-- Execution: Index-only scan, no table access needed
```

### N+1 Query Prevention

**Problem:**
```typescript
// ❌ N+1: Fetches saved products, then N queries for product details
const saved = await prisma.savedProduct.findMany({ where: { userId } });

for (const s of saved) {
  const product = await prisma.product.findUnique({ where: { id: s.productId } });
  // ... use product
}
```

**Solution:**
```typescript
// ✅ Single query with join
const saved = await prisma.savedProduct.findMany({
  where: { userId },
  include: {
    product: {
      select: {
        id: true,
        slug: true,
        title: true,
        imageUrl: true,
        lowestPrice: true,
        currency: true,
        _count: {
          select: { offers: true }  // For marketplaceCount
        }
      }
    }
  }
});
```

### Caching Strategy

**Redis Caching (API-level):**

```typescript
// Cache product details for slug route
async getBySlug(slug: string): Promise<Product> {
  const cacheKey = `product:slug:${slug}`;
  
  // Try cache first
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from DB
  const product = await this.prisma.product.findUnique({
    where: { slug },
    include: { offers: { include: { marketplace: true } } }
  });
  
  if (product) {
    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(product));
  }
  
  return product;
}
```

**React Query Caching (Client-level):**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,      // 1 minute
      cacheTime: 300_000,     // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});
```

**Cache Invalidation:**

```typescript
// After save/unsave mutation
queryClient.invalidateQueries({ queryKey: ['saved'] });
queryClient.invalidateQueries({ queryKey: ['saved', 'count'] });
queryClient.invalidateQueries({ queryKey: ['saved', productId] });
```

### Pagination

**Cursor-based pagination** for large datasets (future enhancement):

```typescript
// Offset pagination (current, simple)
const saved = await prisma.savedProduct.findMany({
  where: { userId },
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' }
});

// Cursor pagination (future, more efficient for large offsets)
const saved = await prisma.savedProduct.findMany({
  where: { userId },
  take: pageSize,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' }
});
```

### BullMQ Configuration

**Queue Settings:**

```typescript
const queueConfig = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,  // 5s, 10s, 20s, 40s, 80s
    },
    removeOnComplete: {
      age: 86400,     // Keep completed jobs for 24h
      count: 1000,    // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 604800,    // Keep failed jobs for 7 days
      count: 5000,    // Keep max 5000 failed jobs
    },
  },
};
```

**Concurrency:**

```typescript
// Notification dispatch worker
@Processor('notification-dispatch', {
  concurrency: 5,  // Process 5 jobs in parallel
  limiter: {
    max: 100,      // Max 100 jobs processed
    duration: 60000  // Per 60 seconds
  }
})
```

---

## Email Templating System

### Template Engine

**Technology:** Handlebars (via `nodemailer-handlebars`)

**Directory Structure:**
```
apps/api/src/templates/
├── email/
│   ├── layouts/
│   │   └── default.hbs
│   ├── price-drop.hbs
│   ├── price-drop.txt.hbs
│   └── partials/
│       ├── header.hbs
│       ├── footer.hbs
│       └── button.hbs
```

### Price Drop Email Template

**HTML Template:** `price-drop.hbs`

```handlebars
{{> header }}

<div class="container">
  <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">
    Price Drop Alert!
  </h1>
  
  {{#if productImage}}
  <img 
    src="{{productImage}}" 
    alt="{{productTitle}}" 
    style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 16px;"
  />
  {{/if}}
  
  <h2 style="color: #333; font-size: 20px; margin: 0 0 8px 0;">
    {{productTitle}}
  </h2>
  
  <div class="price-comparison" style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <div class="price-row">
      <span class="label">Previous Price:</span>
      <span class="old-price" style="text-decoration: line-through; color: #999;">
        {{currency}} {{oldPrice}}
      </span>
    </div>
    <div class="price-row">
      <span class="label">New Price:</span>
      <span class="new-price" style="color: #22c55e; font-weight: bold; font-size: 18px;">
        {{currency}} {{newPrice}}
      </span>
    </div>
    <div class="savings" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">
      <strong>You save:</strong> {{currency}} {{savings}} ({{savingsPercent}}%)
    </div>
  </div>
  
  <p style="color: #666; margin: 16px 0;">
    Available on <strong>{{marketplaceName}}</strong>
  </p>
  
  {{> button text="View Product" url=productUrl }}
  
  <p style="color: #999; font-size: 14px; margin-top: 24px;">
    You're receiving this because you set up a price alert for this product.
    <a href="{{appUrl}}/alerts" style="color: #3b82f6;">Manage your alerts</a>
  </p>
</div>

{{> footer }}
```

**Plain Text Template:** `price-drop.txt.hbs`

```handlebars
PRICE DROP ALERT: {{productTitle}}

Previous Price: {{currency}} {{oldPrice}}
New Price: {{currency}} {{newPrice}}
You save: {{currency}} {{savings}} ({{savingsPercent}}%)

Available on {{marketplaceName}}

View product: {{productUrl}}

---
You're receiving this because you set up a price alert for this product.
Manage your alerts: {{appUrl}}/alerts
```

### Template Context

```typescript
interface PriceDropContext {
  productTitle: string;
  productImage?: string;
  oldPrice: string;        // Formatted: "123.45"
  newPrice: string;        // Formatted: "98.99"
  savings: string;         // Formatted: "24.46"
  savingsPercent: string;  // Formatted: "19.8"
  currency: string;        // "USD", "UZS", etc.
  marketplaceName: string;
  productUrl: string;      // Absolute URL
  appUrl: string;          // Base app URL
}
```

### Mailer Service Configuration

```typescript
// apps/api/src/infra/mailer/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as hbs from 'nodemailer-express-handlebars';
import * as path from 'path';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter | null = null;
  private isDryRun: boolean;
  private readonly logger = new Logger(MailerService.name);

  constructor(private config: ConfigService) {
    const smtpHost = this.config.get('SMTP_HOST');
    const smtpUser = this.config.get('SMTP_USER');
    
    this.isDryRun = !smtpHost || !smtpUser;
    
    if (this.isDryRun) {
      this.logger.warn('SMTP not configured, running in dry-run mode');
      return;
    }
    
    this.transporter = nodemailer.createTransporter({
      host: smtpHost,
      port: this.config.get('SMTP_PORT', 587),
      secure: this.config.get('SMTP_SECURE', false),
      auth: {
        user: smtpUser,
        pass: this.config.get('SMTP_PASS'),
      },
    });
    
    // Configure Handlebars
    this.transporter.use('compile', hbs({
      viewEngine: {
        extname: '.hbs',
        layoutsDir: path.resolve(__dirname, '../../templates/email/layouts'),
        partialsDir: path.resolve(__dirname, '../../templates/email/partials'),
        defaultLayout: 'default',
      },
      viewPath: path.resolve(__dirname, '../../templates/email'),
      extName: '.hbs',
    }));
  }
  
  async sendMail(options: MailOptions): Promise<void> {
    if (this.isDryRun) {
      this.logger.log(`[DRY RUN] Would send email to ${options.to}: ${options.subject}`);
      return;
    }
    
    const mailOptions = {
      from: this.config.get('MAIL_FROM', 'noreply@pricepulse.local'),
      to: options.to,
      subject: options.subject,
      template: options.template,
      context: options.context,
    };
    
    await this.transporter.sendMail(mailOptions);
    this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
  }
}
```

---

## Deployment Configuration

### Environment Variables

**API (.env):**

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/pricepulse"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# SMTP (optional, dry-run if unset)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
MAIL_FROM="PricePulse <noreply@pricepulse.com>"

# App URLs
APP_URL="https://pricepulse.vercel.app"
NEXT_PUBLIC_APP_URL="https://pricepulse.vercel.app"

# Feature Configuration
SEARCH_HISTORY_MAX_PER_USER=100
ALERT_EMAIL_COOLDOWN_HOURS=24

# Telegram (optional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_ADMIN_CHAT_ID=""
```

**Web (.env.local):**

```bash
NEXT_PUBLIC_API_URL="https://your-api.railway.app"
NEXT_PUBLIC_APP_URL="https://pricepulse.vercel.app"
```

### Railway Configuration

**nixpacks.toml:**

```toml
[phases.setup]
nixPkgs = ['nodejs-18_x', 'openssl']

[phases.install]
cmds = ['npm ci']

[phases.build]
cmds = [
  'npx prisma generate',
  'npm run build'
]

[start]
cmd = 'npm run start:prod'
```

**Start Script:**

```bash
#!/bin/bash
# apps/api/scripts/start.sh

# Run migrations
npx prisma migrate deploy

# Start application
node dist/main.js
```

### Vercel Configuration

**vercel.json:**

```json
{
  "buildCommand": "cd apps/web && npm run build",
  "devCommand": "cd apps/web && npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url",
    "NEXT_PUBLIC_APP_URL": "@app-url"
  }
}
```

### Health Checks

**API Health Endpoint:**

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}
  
  @Get()
  async check() {
    const checks = {
      database: 'unknown',
      redis: 'unknown',
      timestamp: new Date().toISOString(),
    };
    
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'healthy';
    } catch {
      checks.database = 'unhealthy';
    }
    
    try {
      await this.redis.ping();
      checks.redis = 'healthy';
    } catch {
      checks.redis = 'unhealthy';
    }
    
    const isHealthy = checks.database === 'healthy' && checks.redis === 'healthy';
    
    return {
      status: isHealthy ? 'ok' : 'degraded',
      checks,
    };
  }
}
```

---

## Accessibility Requirements

All UI components comply with WCAG 2.1 Level AA:

### Keyboard Navigation

- All interactive elements reachable via Tab
- Enter/Space activates buttons
- Escape closes dialogs
- No keyboard traps

### Screen Reader Support

```tsx
// Heart Button
<button
  aria-pressed={isSaved}
  aria-label={isSaved ? `Remove ${title} from saved` : `Save ${title}`}
>
  <Heart />
</button>

// Saved Count Badge
<div aria-live="polite" aria-atomic="true">
  <span className="sr-only">Saved products:</span>
  {count > 0 && <span>{count > 99 ? '99+' : count}</span>}
</div>

// Quick-create form
<label htmlFor="alert-threshold">
  Notify me when price drops below
</label>
<input
  id="alert-threshold"
  type="number"
  inputMode="decimal"
  aria-describedby={error ? "threshold-error" : undefined}
  aria-invalid={!!error}
/>
{error && (
  <div id="threshold-error" role="alert">
    {error.message}
  </div>
)}
```

### Color Contrast

- Text: >= 4.5:1 contrast
- UI components: >= 3:1 contrast
- Focus indicators: >= 3:1 contrast, 2px minimum

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Summary

The PricePulse Engagement Suite design provides:

✅ **Complete Architecture** — Backend modules, frontend components, BullMQ workers
✅ **Database Schema** — Two new models with proper indexing and referential integrity
✅ **API Contracts** — RESTful endpoints with validation, pagination, ownership enforcement
✅ **Frontend UX** — React Query hooks, optimistic updates, accessible components
✅ **Email Pipeline** — Reliable delivery with deduplication, retry, and templating
✅ **Property-Based Testing** — 11 universal properties covering core business logic
✅ **Security** — JWT auth, IDOR prevention, rate limiting, input validation
✅ **Performance** — Indexed queries, N+1 prevention, caching, bounded payloads
✅ **Production-Ready** — Health checks, logging, monitoring, deployment configs

### Next Steps

1. Review and approve this design
2. Proceed to task breakdown (tasks.md)
3. Implement database migrations
4. Build API modules
5. Build frontend features
6. Write property-based tests
7. Integration testing
8. Deploy to Railway + Vercel

---

*Document Version: 1.0*  
*Last Updated: 2025*  
*Feature: pricepulse-engagement-suite*
