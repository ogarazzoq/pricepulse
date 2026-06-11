import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  mode: process.env.TELEGRAM_MODE || 'polling', // 'polling' or 'webhook'
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
}));
