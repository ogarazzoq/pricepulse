import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotController } from './telegram-bot.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { SavedProductsModule } from '../saved-products/saved-products.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CollectionsModule } from '../collections/collections.module';

@Module({
  imports: [AlertsModule, SavedProductsModule, NotificationsModule, CollectionsModule],
  controllers: [TelegramBotController],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
