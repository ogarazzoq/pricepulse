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
    try {
      await this.botService.handleUpdate(update);
      return { ok: true };
    } catch (error) {
      this.logger.error('Webhook error:', error);
      return { ok: false };
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
