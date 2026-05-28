import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MailerService } from '../../infra/mailer/mailer.service';
import { TelegramService } from '../../infra/telegram/telegram.service';

interface DispatchInput {
  userId: string;
  alertId?: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly telegram: TelegramService,
  ) {}

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
