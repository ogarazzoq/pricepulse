import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  priceSyncCron: process.env.PRICE_SYNC_CRON || '0 */2 * * *',
  alertEvaluateCron: process.env.ALERT_EVALUATE_CRON || '*/15 * * * *',
}));
