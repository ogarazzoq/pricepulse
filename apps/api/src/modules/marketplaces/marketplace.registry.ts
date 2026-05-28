import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FakeStoreProvider } from './providers/fakestore.provider';
import { DummyJsonProvider } from './providers/dummyjson.provider';
import { MarketplaceProvider } from './providers/marketplace-provider.interface';
import { PrismaService } from '../../infra/prisma/prisma.service';

/**
 * Central registry of all marketplace providers.
 *
 * `all()` returns only providers that:
 *   1. Are wired in code, AND
 *   2. Have a corresponding `Marketplace` row with `isActive = true`.
 *
 * The active-set is cached for 60s to avoid hammering Postgres on every search.
 */
@Injectable()
export class MarketplaceRegistry {
  private readonly logger = new Logger(MarketplaceRegistry.name);
  private readonly providers = new Map<string, MarketplaceProvider>();
  private activeCache: { slugs: Set<string>; expiresAt: number } | null = null;
  private readonly CACHE_TTL_MS = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    fakeStore: FakeStoreProvider,
    dummyJson: DummyJsonProvider,
  ) {
    this.register(fakeStore);
    this.register(dummyJson);
  }

  register(provider: MarketplaceProvider) {
    this.providers.set(provider.slug, provider);
    this.logger.log(`Registered marketplace provider: ${provider.slug}`);
  }

  get(slug: string): MarketplaceProvider {
    const provider = this.providers.get(slug);
    if (!provider) throw new NotFoundException(`No marketplace provider for slug "${slug}"`);
    return provider;
  }

  has(slug: string): boolean {
    return this.providers.has(slug);
  }

  /** Synchronous: returns ALL registered providers (no DB filter). */
  registered(): MarketplaceProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Returns providers that are both registered AND active in the database.
   * Falls back to all registered providers if the DB query fails.
   */
  async all(): Promise<MarketplaceProvider[]> {
    const active = await this.activeSlugs();
    return Array.from(this.providers.values()).filter((p) => active.has(p.slug));
  }

  slugs(): string[] {
    return Array.from(this.providers.keys());
  }

  private async activeSlugs(): Promise<Set<string>> {
    const now = Date.now();
    if (this.activeCache && this.activeCache.expiresAt > now) {
      return this.activeCache.slugs;
    }
    try {
      const rows = await this.prisma.marketplace.findMany({
        where: { isActive: true },
        select: { slug: true },
      });
      const slugs = new Set(rows.map((r) => r.slug));
      this.activeCache = { slugs, expiresAt: now + this.CACHE_TTL_MS };
      return slugs;
    } catch (err: any) {
      this.logger.warn(`activeSlugs query failed (${err?.message}); using all registered`);
      return new Set(this.providers.keys());
    }
  }

  /** Invalidate cache after admin toggle. */
  invalidateCache() {
    this.activeCache = null;
  }
}
