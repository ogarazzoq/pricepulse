import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvSchema {
  @IsEnum(NodeEnv)
  NODE_ENV!: NodeEnv;

  @IsOptional()
  @IsInt()
  PORT?: number;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_HOST!: string;

  @IsOptional()
  @IsInt()
  REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsString()
  @MinLength(16, { message: 'JWT_ACCESS_SECRET must be at least 16 characters' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(16, { message: 'JWT_REFRESH_SECRET must be at least 16 characters' })
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  TELEGRAM_BOT_TOKEN?: string;

  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  // Marketplace API keys
  @IsOptional()
  @IsString()
  BESTBUY_API_KEY?: string;

  @IsOptional()
  @IsString()
  UPCITEMDB_API_KEY?: string;

  // Optional bootstrap: if set, an admin user is upserted on every boot.
  @IsOptional()
  @IsString()
  BOOTSTRAP_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  BOOTSTRAP_ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  BOOTSTRAP_ADMIN_NAME?: string;
}

/**
 * Validates required environment variables at boot.
 * Throws a hard error in production; warns (and continues) in dev/test.
 */
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvSchema, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const formatted = errors
      .map((e) => `  • ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');

    if (config.NODE_ENV === 'production') {
      throw new Error(`Invalid environment configuration:\n${formatted}`);
    }
    // eslint-disable-next-line no-console
    console.warn(`⚠️  Environment validation warnings:\n${formatted}`);
  }
  return validated;
}
