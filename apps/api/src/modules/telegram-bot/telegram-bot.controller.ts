import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('telegram')
export class TelegramBotController {
  private readonly logger = new Logger(TelegramBotController.name);

  constructor(private readonly botService: TelegramBotService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() update: any) {
    // Only handle webhook if bot is in webhook mode
    const bot = this.botService.getBot();
    if (!bot) {
      this.logger.warn('Bot not available - may be running in polling mode');
      return { ok: false, error: 'Bot not configured for webhook mode' };
    }

    try {
      await this.botService.handleUpdate(update);
      return { ok: true };
    } catch (error) {
      this.logger.error('Webhook error:', error);
      return { ok: false, error: 'Webhook processing failed' };
    }
  }

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'telegram-bot',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
