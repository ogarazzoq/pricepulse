import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { JOB, QUEUE } from '../queues';
import { MarketplaceRegistry } from '../../marketplaces/marketplace.registry';
import { ProductsService } from '../../products/products.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';

/**
 * Price-sync worker — periodically refreshes offer prices from
 * every active marketplace provider and creates a price snapshot.
 */
@Processor(QUEUE.PRICE_SYNC, { concurrency: 2 })
export class PriceSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(PriceSyncProcessor.name);

  constructor(
    private readonly registry: MarketplaceRegistry,
    private readonly products: ProductsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<{ synced: number }> {
    if (job.name === JOB.PRICE_SYNC_ALL) {
      return this.syncAll();
    }
    return { synced: 0 };
  }

  private async syncAll(): Promise<{ synced: number }> {
    let synced = 0;
    const providers = await this.registry.all();
    for (const provider of providers) {
      if (!provider.listAll) continue;
      try {
        const items = await provider.listAll();
        for (const item of items) {
          await this.products.upsertNormalizedProduct(item);
          synced++;
        }
        this.logger.log(`Synced ${items.length} items from ${provider.slug}`);
      } catch (err: any) {
        this.logger.error(`Sync failed for ${provider.slug}: ${err?.message}`);
      }
    }
    await this.prisma.jobLog.create({
      data: {
        queue: QUEUE.PRICE_SYNC,
        jobName: JOB.PRICE_SYNC_ALL,
        status: 'COMPLETED',
        result: { synced },
        finishedAt: new Date(),
      },
    });
    return { synced };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }
}
