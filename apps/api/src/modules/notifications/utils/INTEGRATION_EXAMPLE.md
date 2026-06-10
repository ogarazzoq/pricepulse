# Integration Example: Price Bucket Hash

This document shows how the `computePriceBucketHash` utility will be integrated into the notification pipeline in upcoming tasks.

## Task 5.3: Dedup Guard in NotificationsService

```typescript
// apps/api/src/modules/notifications/notifications.service.ts

import { computePriceBucketHash } from './utils';

@Injectable()
export class NotificationsService {
  // ... existing code ...

  /**
   * Checks if a notification with the same price bucket hash
   * was sent within the cooldown window.
   * 
   * Used by the notification-dispatch worker to prevent duplicate emails.
   */
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
}
```

## Task 6.2: Computing Hash in Alert-Evaluate Worker

```typescript
// apps/api/src/modules/jobs/processors/alert-evaluate.processor.ts

import { computePriceBucketHash } from '../../notifications/utils';

@Processor(QUEUE.ALERT_EVALUATE, { concurrency: 4 })
export class AlertEvaluateProcessor extends WorkerHost {
  // ... existing code ...

  async process(job: Job) {
    if (job.name !== JOB.EVALUATE_ALL_ALERTS) return;

    const active = await this.prisma.alert.findMany({
      where: { status: AlertStatus.ACTIVE },
      include: { product: true },
    });

    for (const alert of active) {
      try {
        const triggered = await this.alerts.evaluate(alert);
        
        if (triggered) {
          // Compute the price bucket hash for deduplication
          const priceBucketHash = computePriceBucketHash(
            alert.id,
            triggered.offerId,
            triggered.condition,
            triggered.threshold,
            triggered.currentPrice
          );
          
          for (const channel of alert.channels as NotificationChannel[]) {
            await this.notificationQueue.add(JOB.DISPATCH_NOTIFICATION, {
              ...triggered,
              userId: alert.userId,
              alertId: alert.id,
              channel,
              productTitle: alert.product.title,
              productImageUrl: alert.product.imageUrl,
              metadata: {
                priceBucketHash,  // Store the hash in metadata
                offerId: triggered.offerId,
                marketplaceSlug: triggered.marketplaceSlug,
                oldPrice: null,  // TODO: Get from price history
                newPrice: triggered.currentPrice,
                threshold: triggered.threshold,
                condition: triggered.condition,
              },
            });
          }
          
          await this.alerts.markTriggered(alert.id);
        }
      } catch (err: any) {
        this.logger.warn(`Alert ${alert.id} evaluation failed: ${err?.message}`);
      }
    }
  }
}
```

## Task 6.2: Using Hash in Notification-Dispatch Worker

```typescript
// apps/api/src/modules/jobs/processors/notification-dispatch.processor.ts

@Processor(QUEUE.NOTIFICATION_DISPATCH, { concurrency: 4 })
export class NotificationDispatchProcessor extends WorkerHost {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly mailer: MailerService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job) {
    const { notificationId } = job.data;
    const attemptNumber = job.attemptsMade + 1;
    
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true, alert: { include: { product: true } } },
    });
    
    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found, skipping`);
      return;
    }
    
    // Dedup guard using the price bucket hash
    const metadata = notification.metadata as NotificationMetadata;
    if (metadata.priceBucketHash) {
      const cooldownHours = this.getCooldownHours(); // From env, default 24
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
    
    // Send email if not a duplicate
    if (notification.channel === 'EMAIL') {
      await this.sendEmail(notification);
    }
    
    // Mark sent
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        metadata: { ...metadata, retryCount: attemptNumber },
      },
    });
  }
  
  private getCooldownHours(): number {
    const env = process.env.ALERT_EMAIL_COOLDOWN_HOURS;
    if (!env) return 24;
    const parsed = parseInt(env, 10);
    if (isNaN(parsed)) {
      this.logger.warn(`Invalid ALERT_EMAIL_COOLDOWN_HOURS: ${env}, using 24`);
      return 24;
    }
    return Math.max(1, Math.min(168, parsed)); // Clamp to 1-168 hours
  }
}
```

## Example Flow

1. **Price changes**: Product offer price drops from $99.99 to $85.50
2. **Price-Sync Worker**: Updates the `ProductOffer` row
3. **Alert-Evaluate Worker**: 
   - Evaluates alert-123 with condition BELOW $90
   - Condition met (85.50 < 90)
   - Computes hash: `computePriceBucketHash('alert-123', 'offer-456', 'BELOW', 90, 85.50)`
   - Enqueues notification with metadata.priceBucketHash
4. **Notification-Dispatch Worker**:
   - Receives notification job
   - Checks `isDuplicate()` with the hash
   - If no duplicate found in past 24h, sends email
   - If duplicate found, marks as SENT with deduped=true
5. **Result**: User receives at most one email per (alert, offer, price-bucket) per 24 hours

## Why This Matters

Without this deduplication:
- Price fluctuates: $85.50 → $85.49 → $85.51 → $85.50
- User receives 4 emails for essentially the same price point
- Poor user experience, potential spam complaints

With this deduplication:
- All prices round to $85.50
- Hash is the same for all evaluations
- User receives 1 email
- Better user experience, respects cooldown period

## Configuration

Set in environment variables:
```bash
# Cooldown period in hours (1-168, default 24)
ALERT_EMAIL_COOLDOWN_HOURS=24
```
