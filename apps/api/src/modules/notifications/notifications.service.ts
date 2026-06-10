import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MailerService } from '../../infra/mailer/mailer.service';
import { TelegramService } from '../../infra/telegram/telegram.service';
import { NotificationMetadata } from './interfaces';

interface DispatchInput {
  userId: string;
  alertId?: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  metadata?: NotificationMetadata;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly telegram: TelegramService,
  ) {}

  /**
   * Get the email cooldown duration in hours from environment variable.
   * 
   * Reads ALERT_EMAIL_COOLDOWN_HOURS from env, clamps to 1-168 hours.
   * Defaults to 24 hours if unset or non-parseable.
   * Logs a warning if the value is non-parseable.
   * 
   * @returns Cooldown duration in hours (1-168)
   * @see Requirement 16.5, 16.6
   */
  private getCooldownHours(): number {
    const env = process.env.ALERT_EMAIL_COOLDOWN_HOURS;
    if (!env) {
      return 24;
    }

    const parsed = parseInt(env, 10);
    if (isNaN(parsed)) {
      this.logger.warn(
        `Invalid ALERT_EMAIL_COOLDOWN_HOURS: ${env}, using default 24 hours`,
      );
      return 24;
    }

    // Clamp to 1-168 hours (1 hour to 1 week)
    return Math.max(1, Math.min(168, parsed));
  }

  /**
   * Check if a notification with the same priceBucketHash exists within the cooldown window.
   * 
   * This implements the deduplication guard to prevent sending multiple emails for the
   * same price bucket transition. Queries the database for an existing notification
   * with matching userId and priceBucketHash within the cooldown period.
   * 
   * @param userId - The user ID to check for
   * @param priceBucketHash - The hash identifying this price bucket
   * @param cooldownHours - Cooldown duration in hours (defaults to env value or 24)
   * @returns True if a duplicate exists within the cooldown window, false otherwise
   * @throws If database query times out (2 second timeout)
   * @see Requirement 16.2, 16.3, 16.4
   */
  async isDuplicate(
    userId: string,
    priceBucketHash: string,
    cooldownHours?: number,
  ): Promise<boolean> {
    const cooldown = cooldownHours ?? this.getCooldownHours();
    const cutoff = new Date(Date.now() - cooldown * 60 * 60 * 1000);

    try {
      // Use $transaction with timeout for 2-second query timeout (Requirement 16.2)
      const existing = await this.prisma.$transaction(
        async (tx) => {
          return tx.notification.findFirst({
            where: {
              userId,
              createdAt: { gte: cutoff },
              metadata: {
                path: ['priceBucketHash'],
                equals: priceBucketHash,
              },
            },
            select: { id: true },
          });
        },
        {
          timeout: 2000, // 2-second timeout
        },
      );

      return !!existing;
    } catch (error: any) {
      this.logger.error(
        `Dedup check failed for userId=${userId}, hash=${priceBucketHash}: ${error?.message}`,
      );
      // Re-throw to fail the job for BullMQ retry (Requirement 16.9)
      throw error;
    }
  }

  /**
   * Increment the retry count in a notification's metadata.
   * 
   * Updates the notification record to increment the retryCount field
   * in the metadata JSON. This tracks how many delivery attempts have
   * been made for this notification.
   * 
   * @param notificationId - The ID of the notification to update
   * @returns Promise that resolves when the update is complete
   * @see Requirement 15.6
   */
  async incrementRetry(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { metadata: true },
    });

    if (!notification) {
      this.logger.warn(`Cannot increment retry for missing notification ${notificationId}`);
      return;
    }

    const metadata = (notification.metadata as NotificationMetadata) || {};
    const retryCount = (metadata.retryCount || 0) + 1;

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        metadata: {
          ...metadata,
          retryCount,
        } as any,
      },
    });
  }

  async listForUser(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async dispatch(input: DispatchInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        alertId: input.alertId,
        channel: input.channel,
        subject: input.subject,
        body: input.body,
        metadata: input.metadata as any,
        status: NotificationStatus.PENDING,
      },
    });

    try {
      await this.deliver(notification.id, input);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
    } catch (err: any) {
      this.logger.error(`Notification ${notification.id} failed: ${err?.message}`);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          failedAt: new Date(),
          errorMessage: String(err?.message ?? err),
        },
      });
    }
    return notification;
  }

  private async deliver(_notificationId: string, input: DispatchInput) {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new Error('User not found');

    switch (input.channel) {
      case NotificationChannel.EMAIL:
        await this.mailer.send({
          to: user.email,
          subject: input.subject,
          html: input.body,
        });
        break;
      case NotificationChannel.TELEGRAM:
        if (!user.telegramChatId) throw new Error('User has no Telegram chat configured');
        await this.telegram.sendMessage(user.telegramChatId, input.body);
        break;
      case NotificationChannel.IN_APP:
        // Stored in DB only — surfaced via /notifications endpoint.
        break;
    }
  }
}
