import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AlertStatus, NotificationChannel } from '@prisma/client';
import { JOB, QUEUE } from '../queues';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AlertsService } from '../../alerts/alerts.service';

/**
 * Alert-evaluate worker — iterates active alerts, evaluates conditions,
 * and enqueues notification dispatch jobs when triggered.
 */
@Processor(QUEUE.ALERT_EVALUATE, { concurrency: 4 })
export class AlertEvaluateProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertEvaluateProcessor.name);

  constructor(
    @InjectQueue(QUEUE.NOTIFICATION_DISPATCH) private readonly notificationQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name !== JOB.EVALUATE_ALL_ALERTS) return;

    const active = await this.prisma.alert.findMany({
      where: { status: AlertStatus.ACTIVE },
      include: { product: true },
    });

    let triggeredCount = 0;
    for (const alert of active) {
      try {
        const triggered = await this.alerts.evaluate(alert);
        if (triggered) {
          for (const channel of alert.channels as NotificationChannel[]) {
            await this.notificationQueue.add(JOB.DISPATCH_NOTIFICATION, {
              ...triggered,
              userId: alert.userId,
              alertId: alert.id,
              channel,
              productTitle: alert.product.title,
              productImageUrl: alert.product.imageUrl,
            });
          }
          await this.alerts.markTriggered(alert.id);
          triggeredCount++;
        }
      } catch (err: any) {
        this.logger.warn(`Alert ${alert.id} evaluation failed: ${err?.message}`);
      }
    }

    this.logger.log(`Evaluated ${active.length} alerts, ${triggeredCount} triggered.`);
    await this.prisma.jobLog.create({
      data: {
        queue: QUEUE.ALERT_EVALUATE,
        jobName: JOB.EVALUATE_ALL_ALERTS,
        status: 'COMPLETED',
        result: { evaluated: active.length, triggered: triggeredCount },
        finishedAt: new Date(),
      },
    });
  }
}
