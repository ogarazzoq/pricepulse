import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FakeStoreProvider } from './providers/fakestore.provider';
import { DummyJsonProvider } from './providers/dummyjson.provider';
import { EscuelaJsProvider } from './providers/escuelajs.provider';
import { OpenFoodFactsProvider } from './providers/openfoodfacts.provider';
import { BestBuyProvider } from './providers/bestbuy.provider';
import { OlchaProvider } from './providers/olcha.provider';
import { AmazonProvider } from './providers/amazon.provider';
import { MarketplaceProvider } from './providers/marketplace-provider.interface';
import { PrismaService } from '../../infra/prisma/prisma.service';

/**
 * Central registry of all marketplace providers.
 *
 * `all()` returns providers that:
 *   1. Are wired in code, AND
 *   2. Have a corresponding `Marketplace` row with `isActive = true`, AND
 *   3. Self-report enabled (e.g. Best Buy without API key returns enabled=false).
 *
 * The active-set is cached for 60s.
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
    escuelaJs: EscuelaJsProvider,
    openFoodFacts: OpenFoodFactsProvider,
    bestBuy: BestBuyProvider,
    olcha: OlchaProvider,
    amazon: AmazonProvider,
  ) {
    this.register(fakeStore);
    this.register(dummyJson);
    this.register(escuelaJs);
    this.register(openFoodFacts);
    this.register(bestBuy);
    this.register(olcha);
    this.register(amazon);
  }

  register(provider: MarketplaceProvider) {
    this.providers.set(provider.slug, provider);
    this.logger.log(
      `Registered ${provider.kind} provider: ${provider.slug} (enabled=${provider.enabled})`,
    );
  }

  get(slug: string): MarketplaceProvider {
    const provider = this.providers.get(slug);
    if (!provider) throw new NotFoundException(`No marketplace provider for slug "${slug}"`);
    return provider;
  }

  has(slug: string): boolean {
    return this.providers.has(slug);
  }

  /** All providers (no active/enabled filter). */
  registered(): MarketplaceProvider[] {
    return Array.from(this.providers.values());
  }

  /** Active in DB AND self-enabled. */
  async all(): Promise<MarketplaceProvider[]> {
    const active = await this.activeSlugs();
    return Array.from(this.providers.values()).filter(
      (p) => p.enabled && active.has(p.slug),
    );
  }

  slugs(): string[] {
    return Array.from(this.providers.keys());
  }

  invalidateCache() {
    this.activeCache = null;
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
}
