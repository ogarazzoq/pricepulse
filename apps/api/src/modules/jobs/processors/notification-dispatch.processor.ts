import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { QUEUE } from '../queues';
import { NotificationsService } from '../../notifications/notifications.service';

interface DispatchPayload {
  userId: string;
  alertId: string;
  channel: NotificationChannel;
  productTitle: string;
  productImageUrl?: string | null;
  marketplaceSlug: string;
  marketplaceName: string;
  currentPrice: number;
  threshold: number;
  productId: string;
}

@Processor(QUEUE.NOTIFICATION_DISPATCH, { concurrency: 5 })
export class NotificationDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationDispatchProcessor.name);

  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(job: Job<DispatchPayload>) {
    const data = job.data;
    const subject = `Price drop alert: ${data.productTitle}`;
    const body = this.buildMessage(data);

    await this.notifications.dispatch({
      userId: data.userId,
      alertId: data.alertId,
      channel: data.channel,
      subject,
      body,
      metadata: {
        productId: data.productId,
        marketplaceSlug: data.marketplaceSlug,
        currentPrice: data.currentPrice,
        threshold: data.threshold,
      },
    });
    this.logger.log(`Dispatched ${data.channel} to user ${data.userId} for alert ${data.alertId}`);
  }

  private buildMessage(d: DispatchPayload): string {
    if (d.channel === NotificationChannel.TELEGRAM) {
      return `<b>📉 Price drop!</b>\n\n${d.productTitle}\nNow: <b>$${d.currentPrice.toFixed(
        2,
      )}</b> on ${d.marketplaceName}\nYour threshold: $${d.threshold.toFixed(2)}`;
    }
    return `
      <div style="font-family:Inter,system-ui;background:#0b0d12;color:#e2e8f0;padding:24px;border-radius:16px;max-width:560px;">
        <h2 style="color:#22c55e;margin:0 0 12px;">📉 Price drop on ${d.productTitle}</h2>
        <p>The product you're tracking has dropped to <b style="color:#fff">$${d.currentPrice.toFixed(
          2,
        )}</b> on <b>${d.marketplaceName}</b>.</p>
        <p>Your alert threshold: <b>$${d.threshold.toFixed(2)}</b></p>
        <a href="#" style="display:inline-block;margin-top:12px;padding:10px 18px;border-radius:10px;background:#6366f1;color:#fff;text-decoration:none;">Open product</a>
      </div>
    `;
  }
}
