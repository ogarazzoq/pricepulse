import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { Redis, RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client: Redis | null;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('redis.host');
    
    // Skip Redis entirely if not configured
    if (!host) {
      this.logger.warn('Redis not configured - running without cache');
      this.client = null;
      return;
    }

    try {
      const options = this.buildConnection();
      // Disable retries to prevent spam
      options.retryStrategy = () => null;
      options.maxRetriesPerRequest = 0;
      options.lazyConnect = true; // Don't connect immediately
      
      this.client = new IORedis(options);
      
      // Try to connect
      this.client.connect().then(() => {
        this.isConnected = true;
        this.logger.log('Redis connected');
      }).catch(() => {
        this.isConnected = false;
        this.logger.warn('Redis unavailable - running without cache');
        this.client = null;
      });
      
      this.client.on('error', () => {
        this.isConnected = false;
      });
    } catch (error) {
      this.logger.warn('Redis not configured or unavailable - running without cache');
      this.client = null;
    }
  }

  /**
   * Returns a connection compatible with both ioredis and BullMQ.
   * BullMQ accepts either a URL string OR a RedisOptions object.
   */
  buildConnection(): RedisOptions {
    const url = this.config.get<string>('redis.url');
    const host = this.config.get<string>('redis.host');
    const port = this.config.get<number>('redis.port');
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
      host: host || 'localhost',
      port: port || 6379,
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
    if (this.client) {
      await this.client.quit();
    }
  }
}
