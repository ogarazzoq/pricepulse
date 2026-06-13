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
      await this.purgeNonKuaiData();
      await this.ensureAdminUser();
    } catch (err: any) {
      this.logger.error(`Bootstrap failed: ${err?.message ?? err}`);
      // Don't crash the app — the bootstrap is best-effort.
      // Health checks remain functional, admin can re-trigger.
    }
  }

  private async purgeNonKuaiData() {
    // Remove all offers from non-kuai marketplaces, then delete orphaned products.
    // This runs once on each deploy; idempotent (nothing to delete after first run).
    const deleted = await this.prisma.productOffer.deleteMany({
      where: { marketplace: { slug: { not: 'kuai' } } },
    });
    if (deleted.count > 0) {
      this.logger.log(`Purged ${deleted.count} non-kuai offers`);
    }

    // Delete products that have no remaining offers
    const orphaned = await this.prisma.product.deleteMany({
      where: { offers: { none: {} } },
    });
    if (orphaned.count > 0) {
      this.logger.log(`Purged ${orphaned.count} orphaned products`);
    }
  }

  // -------------------------------------------------------------------
  private async ensureMarketplaces() {
    // isActive=true only for kuai — admin can enable others via DB/admin panel
    const marketplaces = [
      { slug: 'fakestore',     name: 'FakeStore',         logoUrl: 'https://fakestoreapi.com/icons/logo.png',                        websiteUrl: 'https://fakestoreapi.com',          baseCurrency: 'USD', isActive: false },
      { slug: 'dummyjson',     name: 'DummyJSON',         logoUrl: 'https://dummyjson.com/public/img/dummyjson-logo.svg',             websiteUrl: 'https://dummyjson.com',             baseCurrency: 'USD', isActive: false },
      { slug: 'escuelajs',     name: 'EscuelaJS Store',   logoUrl: 'https://api.escuelajs.co/favicon.ico',                           websiteUrl: 'https://api.escuelajs.co',          baseCurrency: 'USD', isActive: false },
      { slug: 'openfoodfacts', name: 'Open Food Facts',   logoUrl: 'https://world.openfoodfacts.org/images/icons/dist/logo.svg',     websiteUrl: 'https://world.openfoodfacts.org',   baseCurrency: 'USD', isActive: false },
      { slug: 'bestbuy',       name: 'Best Buy',          logoUrl: 'https://logo.clearbit.com/bestbuy.com',                          websiteUrl: 'https://www.bestbuy.com',           baseCurrency: 'USD', isActive: false },
      { slug: 'olcha',         name: 'Olcha.uz',          logoUrl: 'https://olcha.uz/image/original/logo.png',                       websiteUrl: 'https://olcha.uz',                  baseCurrency: 'UZS', isActive: false },
      { slug: 'amazon',        name: 'Amazon',            logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', websiteUrl: 'https://www.amazon.com',       baseCurrency: 'USD', isActive: false },
      { slug: 'kuai',          name: 'Kuai',              logoUrl: 'https://cdn.u-code.io/logo.png',                                 websiteUrl: 'https://api.admin.u-code.io',       baseCurrency: 'USD', isActive: true  },
    ];

    let created = 0;
    let updated = 0;
    for (const m of marketplaces) {
      const existing = await this.prisma.marketplace.findUnique({ where: { slug: m.slug } });
      if (existing) {
        await this.prisma.marketplace.update({
          where: { slug: m.slug },
          // Always sync isActive from this config so admin changes here take effect on restart
          data: { name: m.name, logoUrl: m.logoUrl, websiteUrl: m.websiteUrl, isActive: m.isActive },
        });
        updated++;
      } else {
        await this.prisma.marketplace.create({ data: m });
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
