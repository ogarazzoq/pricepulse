import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { JOB, QUEUE } from './queues';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(QUEUE.PRICE_SYNC) private readonly priceSyncQueue: Queue,
    @InjectQueue(QUEUE.ALERT_EVALUATE) private readonly alertQueue: Queue,
    @InjectQueue(QUEUE.NOTIFICATION_DISPATCH) private readonly notificationQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    // Repeatable jobs — clean up stale ones first, then re-register.
    const priceCron = this.config.get<string>('app.priceSyncCron')!;
    const alertCron = this.config.get<string>('app.alertEvaluateCron')!;

    await this.cleanRepeatable(this.priceSyncQueue);
    await this.cleanRepeatable(this.alertQueue);

    await this.priceSyncQueue.add(
      JOB.PRICE_SYNC_ALL,
      {},
      {
        repeat: { pattern: priceCron },
        removeOnComplete: 100,
        removeOnFail: 100,
        jobId: 'recurring-price-sync',
      },
    );
    await this.alertQueue.add(
      JOB.EVALUATE_ALL_ALERTS,
      {},
      {
        repeat: { pattern: alertCron },
        removeOnComplete: 100,
        removeOnFail: 100,
        jobId: 'recurring-alert-evaluate',
      },
    );

    this.logger.log(`Scheduled price-sync (${priceCron}) and alert-evaluate (${alertCron})`);
  }

  private async cleanRepeatable(queue: Queue) {
    const repeatables = await queue.getRepeatableJobs();
    for (const r of repeatables) {
      await queue.removeRepeatableByKey(r.key);
    }
  }

  /** Manually trigger a sync (admin) */
  async triggerPriceSync() {
    return this.priceSyncQueue.add(JOB.PRICE_SYNC_ALL, { manual: true });
  }

  /** Manually trigger alert evaluation (admin) */
  async triggerAlertEvaluation() {
    return this.alertQueue.add(JOB.EVALUATE_ALL_ALERTS, { manual: true });
  }

  /** Read-only queue snapshot for the admin dashboard. */
  async snapshot() {
    const queues = [this.priceSyncQueue, this.alertQueue, this.notificationQueue];
    return Promise.all(
      queues.map(async (q) => ({
        name: q.name,
        counts: await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      })),
    );
  }

  recentLogs() {
    return this.prisma.jobLog.findMany({ orderBy: { startedAt: 'desc' }, take: 50 });
  }

  /**
   * Decorator-based cron fallback that pings the queue if the
   * repeatable job has been removed manually. Acts as a safety net.
   */
  @Cron('0 */6 * * *')
  private async ensureRecurring() {
    const repeats = await this.priceSyncQueue.getRepeatableJobs();
    if (repeats.length === 0) {
      this.logger.warn('No repeatable price-sync job found — re-queueing.');
      await this.onModuleInit();
    }
  }
}
