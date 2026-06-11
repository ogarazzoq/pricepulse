import { registerAs } from '@nestjs/config';

/**
 * Redis configuration.
 *
 * Production (Railway, Upstash, etc.) typically exposes a single REDIS_URL.
 * Local dev can use the host/port/password trio.
 *
 * If both are present, REDIS_URL wins.
 */
export default registerAs('redis', () => ({
  url: process.env.REDIS_URL || undefined,
  host: process.env.REDIS_HOST || undefined,
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  // Set to true in production behind TLS-capable Redis (rediss://).
  tls: process.env.REDIS_TLS === 'true',
}));
