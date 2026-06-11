import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import mailerConfig from './config/mailer.config';
import telegramConfig from './config/telegram.config';
import { validateEnv } from './config/env.validation';

import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { MailerModule } from './infra/mailer/mailer.module';
import { TelegramModule } from './infra/telegram/telegram.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MarketplacesModule } from './modules/marketplaces/marketplaces.module';
import { ProductsModule } from './modules/products/products.module';
import { PricesModule } from './modules/prices/prices.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { HealthModule } from './modules/health/health.module';
import { BootstrapModule } from './modules/bootstrap/bootstrap.module';
import { SavedProductsModule } from './modules/saved-products/saved-products.module';
import { SearchHistoryModule } from './modules/search-history/search-history.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, redisConfig, mailerConfig, telegramConfig],
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),

    // Infrastructure
    PrismaModule,
    RedisModule,
    MailerModule,
    TelegramModule,

    // Domain
    AuthModule,
    UsersModule,
    MarketplacesModule,
    ProductsModule,
    PricesModule,
    AlertsModule,
    NotificationsModule,
    AnalyticsModule,
    AdminModule,
    JobsModule,
    HealthModule,
    BootstrapModule,
    SavedProductsModule,
    SearchHistoryModule,
    CollectionsModule,
    TelegramBotModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
