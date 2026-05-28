import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { Redis, RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new IORedis(this.buildConnection());
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  /**
   * Returns a connection compatible with both ioredis and BullMQ.
   * BullMQ accepts either a URL string OR a RedisOptions object.
   */
  buildConnection(): RedisOptions {
    const url = this.config.get<string>('redis.url');
    const tls = this.config.get<boolean>('redis.tls');

    if (url) {
      // ioredis can parse URL directly via constructor — but for BullMQ
      // we also need a RedisOptions object. Easiest: parse and extract.
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        username: parsed.username || undefined,
        password: decodeURIComponent(parsed.password || '') || undefined,
        tls: parsed.protocol === 'rediss:' || tls ? {} : undefined,
        maxRetriesPerRequest: null, // required by BullMQ
        enableReadyCheck: false,
      };
    }

    return {
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password') || undefined,
      tls: tls ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }

  /** BullMQ uses the same options object. */
  getBullConnection(): RedisOptions {
    return this.buildConnection();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
