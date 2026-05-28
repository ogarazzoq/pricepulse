import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly apiBase: string | null;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>('telegram.botToken');
    this.apiBase = token ? `https://api.telegram.org/bot${token}` : null;
    if (!this.apiBase) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured — telegram messages will be logged only.');
    }
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.apiBase) {
      this.logger.warn(`[TG DRY-RUN] chat=${chatId} text=${text.substring(0, 80)}`);
      return;
    }
    try {
      await axios.post(`${this.apiBase}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      });
    } catch (err: any) {
      this.logger.error(`Telegram send failed: ${err?.message}`);
      throw err;
    }
  }
}
