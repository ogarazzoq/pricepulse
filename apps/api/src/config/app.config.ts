import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  // CORS_ORIGIN may be comma-separated - take first for frontend URL
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const frontendUrl =
    process.env.FRONTEND_URL ||
    corsOrigin.split(',')[0].trim();

  return {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 4000),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigin,
    frontendUrl,
    priceSyncCron: process.env.PRICE_SYNC_CRON || '0 */2 * * *',
    alertEvaluateCron: process.env.ALERT_EVALUATE_CRON || '*/15 * * * *',
  };
});
