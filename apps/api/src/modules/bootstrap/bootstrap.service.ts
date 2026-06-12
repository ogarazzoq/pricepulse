import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../infra/prisma/prisma.service';

/**
 * BootstrapService — idempotent application bootstrap.
 *
 * Runs once when the Nest app finishes initializing, ensuring the
 * production database has the data needed for the system to function:
 *
 *   1. Default marketplaces (FakeStore, DummyJSON) — non-secret config.
 *   2. An admin user — ONLY if BOOTSTRAP_ADMIN_EMAIL and
 *      BOOTSTRAP_ADMIN_PASSWORD are set. Credentials never live in code.
 *
 * This replaces `prisma db seed` for production, where:
 *   - Seed runner (tsx) isn't available in the runtime image.
 *   - Hard-coded demo passwords would be a security incident.
 *
 * The bootstrap is fully idempotent (upsert), so it's safe to run on
 * every container restart.
 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.ensureMarketplaces();
      await this.ensureAdminUser();
    } catch (err: any) {
      this.logger.error(`Bootstrap failed: ${err?.message ?? err}`);
      // Don't crash the app — the bootstrap is best-effort.
      // Health checks remain functional, admin can re-trigger.
    }
  }

  // -------------------------------------------------------------------
  private async ensureMarketplaces() {
    const marketplaces = [
      {
        slug: 'fakestore',
        name: 'FakeStore',
        logoUrl: 'https://fakestoreapi.com/icons/logo.png',
        websiteUrl: 'https://fakestoreapi.com',
        baseCurrency: 'USD',
      },
      {
        slug: 'dummyjson',
        name: 'DummyJSON',
        logoUrl: 'https://dummyjson.com/public/img/dummyjson-logo.svg',
        websiteUrl: 'https://dummyjson.com',
        baseCurrency: 'USD',
      },
      {
        slug: 'escuelajs',
        name: 'EscuelaJS Store',
        logoUrl: 'https://api.escuelajs.co/favicon.ico',
        websiteUrl: 'https://api.escuelajs.co',
        baseCurrency: 'USD',
      },
      {
        slug: 'openfoodfacts',
        name: 'Open Food Facts',
        logoUrl: 'https://world.openfoodfacts.org/images/icons/dist/logo.svg',
        websiteUrl: 'https://world.openfoodfacts.org',
        baseCurrency: 'USD',
      },
      {
        slug: 'bestbuy',
        name: 'Best Buy',
        logoUrl: 'https://logo.clearbit.com/bestbuy.com',
        websiteUrl: 'https://www.bestbuy.com',
        baseCurrency: 'USD',
      },
    ];

    let created = 0;
    let updated = 0;
    for (const m of marketplaces) {
      const existing = await this.prisma.marketplace.findUnique({ where: { slug: m.slug } });
      if (existing) {
        // Don't touch isActive — admins may have disabled it deliberately.
        await this.prisma.marketplace.update({
          where: { slug: m.slug },
          data: { name: m.name, logoUrl: m.logoUrl, websiteUrl: m.websiteUrl },
        });
        updated++;
      } else {
        await this.prisma.marketplace.create({ data: { ...m, isActive: true } });
        created++;
      }
    }
    this.logger.log(`Marketplaces ready: ${created} created, ${updated} kept`);
  }

  private async ensureAdminUser() {
    const email = this.config.get<string>('BOOTSTRAP_ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('BOOTSTRAP_ADMIN_PASSWORD');
    const name = this.config.get<string>('BOOTSTRAP_ADMIN_NAME') ?? 'PricePulse Admin';

    if (!email || !password) {
      this.logger.log('No BOOTSTRAP_ADMIN_* envs set; skipping admin bootstrap.');
      // Still ensure the hardcoded super-admin exists
      await this.ensureSuperAdmin();
      return;
    }

    if (password.length < 8) {
      this.logger.warn('BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters; skipping.');
      return;
    }

    const passwordHash = await argon2.hash(password);
    await this.prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: 'ADMIN', name },
      create: { email, name, passwordHash, role: 'ADMIN' },
    });
    this.logger.log(`Admin user "${email}" bootstrapped/updated.`);

    // Always ensure the super admin too
    await this.ensureSuperAdmin();
  }

  private async ensureSuperAdmin() {
    // Super-admin credentials come from environment variables.
    // Set SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME in your .env
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

    if (!email || !password) {
      // No super-admin configured via env — skip silently
      return;
    }

    const passwordHash = await argon2.hash(password);
    await this.prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN', name, passwordHash },
      create: { email, name, passwordHash, role: 'ADMIN' },
    });
    this.logger.log(`Super-admin "${email}" ensured.`);
  }
}
