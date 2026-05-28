import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { QUEUE } from './queues';
import { PriceSyncProcessor } from './processors/price-sync.processor';
import { AlertEvaluateProcessor } from './processors/alert-evaluate.processor';
import { NotificationDispatchProcessor } from './processors/notification-dispatch.processor';
import { ProductsModule } from '../products/products.module';
import { AlertsModule } from '../alerts/alerts.module';
import { RedisService } from '../../infra/redis/redis.service';
import { RedisModule } from '../../infra/redis/redis.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        connection: redis.getBullConnection(),
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE.PRICE_SYNC },
      { name: QUEUE.ALERT_EVALUATE },
      { name: QUEUE.NOTIFICATION_DISPATCH },
    ),
    ProductsModule,
    AlertsModule,
  ],
  providers: [
    JobsService,
    PriceSyncProcessor,
    AlertEvaluateProcessor,
    NotificationDispatchProcessor,
  ],
  exports: [JobsService, BullModule],
})
export class JobsModule {}
