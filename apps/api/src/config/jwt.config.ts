import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  accessTtl: Number(process.env.JWT_ACCESS_TTL || 900), // 15 minutes
  refreshTtl: Number(process.env.JWT_REFRESH_TTL || 60 * 60 * 24 * 30), // 30 days
}));
