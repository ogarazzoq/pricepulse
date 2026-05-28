import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MarketplaceRegistry } from '../marketplaces/marketplace.registry';
import {
  MarketplaceProvider,
  NormalizedProduct,
} from '../marketplaces/providers/marketplace-provider.interface';
import { ProductsRepository } from './products.repository';
import { slugify } from '../../common/utils/slugify';
import { ProductSort } from './dto/search-products.dto';

interface SearchFilters {
  sort?: ProductSort;
  marketplace?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: MarketplaceRegistry,
    private readonly repo: ProductsRepository,
  ) {}

  // -------------------------------------------------------------------
  // Federated search across all active providers.
  //
  // 1. Query every provider in parallel.
  // 2. Persist every normalized result so it has a real productId.
  // 3. Re-fetch from DB to obtain authoritative offers (other marketplaces
  //    may already have offers for the same slug from prior searches/syncs).
  // 4. Apply server-side sort + filters.
  // -------------------------------------------------------------------
  async search(query: string, limit = 24, filters: SearchFilters = {}) {
    const trimmed = query?.trim() ?? '';
    if (trimmed.length < 2) {
      return { query: trimmed, total: 0, items: [], byMarketplace: [] };
    }

    const providers = await this.registry.all();
    const settled = await Promise.allSettled(
      providers.map(async (p) => ({
        provider: p,
        items: await p.searchProducts(trimmed, { limit }),
      })),
    );

    const fulfilled = settled
      .filter(
        (r): r is PromiseFulfilledResult<{ provider: MarketplaceProvider; items: NormalizedProduct[] }> =>
          r.status === 'fulfilled',
      )
      .map((r) => r.value);

    // Log provider failures (rejected) without breaking the request.
    settled
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .forEach((r) => this.logger.warn(`Search provider failed: ${r.reason?.message ?? r.reason}`));

    // Persist synchronously (small N — at most ~50 per provider).
    const persisted = new Set<string>(); // productIds
    for (const { items } of fulfilled) {
      for (const np of items) {
        try {
          const upserted = await this.upsertNormalizedProduct(np);
          if (upserted) persisted.add(upserted.product.id);
        } catch (err: any) {
          this.logger.warn(`upsertNormalizedProduct failed for ${np.title}: ${err?.message}`);
        }
      }
    }

    if (persisted.size === 0) {
      return { query: trimmed, total: 0, items: [], byMarketplace: this.summarizeByMarketplace(fulfilled) };
    }

    // Reload aggregated products with offers from DB.
    let products = await this.prisma.product.findMany({
      where: { id: { in: Array.from(persisted) } },
      include: { offers: { include: { marketplace: true } } },
    });

    // Per-offer filters
    products = products
      .map((p) => ({
        ...p,
        offers: p.offers.filter((o) => {
          if (filters.marketplace && o.marketplace.slug !== filters.marketplace) return false;
          if (filters.inStock != null && o.inStock !== filters.inStock) return false;
          const price = Number(o.currentPrice);
          if (filters.minPrice != null && price < filters.minPrice) return false;
          if (filters.maxPrice != null && price > filters.maxPrice) return false;
          return true;
        }),
      }))
      .filter((p) => p.offers.length > 0);

    // Sort & serialize
    const items = products
      .map((p) => this.serialize(p))
      .sort(this.comparator(filters.sort ?? ProductSort.RELEVANCE, trimmed))
      .slice(0, limit);

    return {
      query: trimmed,
      total: items.length,
      items,
      byMarketplace: this.summarizeByMarketplace(fulfilled),
    };
  }

  // -------------------------------------------------------------------
  // Get product by id (with offers)
  // -------------------------------------------------------------------
  async getById(id: string) {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    await this.repo.incrementViews(id);
    return this.serialize(product);
  }

  async getBySlug(slug: string) {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException('Product not found');
    return this.serialize(product);
  }

  async listCatalog(
    page = 1,
    pageSize = 20,
    query?: string,
    filters: SearchFilters = {},
  ) {
    const skip = (page - 1) * pageSize;
    const where = query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' as const } },
            { brand: { contains: query, mode: 'insensitive' as const } },
            { category: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [items, total] = await Promise.all([
      this.repo.list({ skip, take: pageSize, where }),
      this.repo.count(where),
    ]);

    const filtered = items
      .map((p) => ({
        ...p,
        offers: p.offers.filter((o: any) => {
          if (filters.marketplace && o.marketplace.slug !== filters.marketplace) return false;
          if (filters.inStock != null && o.inStock !== filters.inStock) return false;
          return true;
        }),
      }))
      .filter((p) => p.offers.length > 0)
      .map((p) => this.serialize(p))
      .sort(this.comparator(filters.sort ?? ProductSort.NEWEST));

    return {
      items: filtered,
      total,
      page,
      pageSize,
    };
  }

  // -------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------

  /**
   * Upserts a product (by title-slug) and its marketplace offer.
   * Also creates a price snapshot for time-series analytics.
   */
  async upsertNormalizedProduct(np: NormalizedProduct) {
    const marketplace = await this.prisma.marketplace.findUnique({
      where: { slug: np.marketplaceSlug },
    });
    if (!marketplace) return null;

    const slug = slugify(np.title);
    if (!slug) return null;

    const product = await this.prisma.product.upsert({
      where: { slug },
      update: {
        title: np.title,
        description: np.description,
        brand: np.brand,
        category: np.category,
        imageUrl: np.imageUrl,
      },
      create: {
        slug,
        title: np.title,
        description: np.description,
        brand: np.brand,
        category: np.category,
        imageUrl: np.imageUrl,
      },
    });

    const offer = await this.prisma.productOffer.upsert({
      where: {
        marketplaceId_externalId: {
          marketplaceId: marketplace.id,
          externalId: np.externalId,
        },
      },
      update: {
        productId: product.id,
        currentPrice: np.price,
        originalPrice: np.originalPrice ?? null,
        discountPercent: np.discountPercent ?? null,
        currency: np.currency,
        rating: np.rating ?? null,
        ratingCount: np.ratingCount ?? null,
        inStock: np.inStock,
        stockCount: np.stockCount ?? null,
        externalUrl: np.url ?? null,
        lastSyncedAt: new Date(),
      },
      create: {
        productId: product.id,
        marketplaceId: marketplace.id,
        externalId: np.externalId,
        externalUrl: np.url ?? null,
        currentPrice: np.price,
        originalPrice: np.originalPrice ?? null,
        discountPercent: np.discountPercent ?? null,
        currency: np.currency,
        rating: np.rating ?? null,
        ratingCount: np.ratingCount ?? null,
        inStock: np.inStock,
        stockCount: np.stockCount ?? null,
      },
    });

    await this.prisma.priceSnapshot.create({
      data: {
        productOfferId: offer.id,
        price: np.price,
        currency: np.currency,
        inStock: np.inStock,
      },
    });

    // Update cached aggregates on the product (lowest/highest/avg).
    await this.recomputeProductAggregates(product.id);

    return { product, offer };
  }

  private async recomputeProductAggregates(productId: string) {
    const offers = await this.prisma.productOffer.findMany({
      where: { productId },
      select: { currentPrice: true },
    });
    if (offers.length === 0) return;
    const prices = offers.map((o) => Number(o.currentPrice));
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const average = Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2));
    await this.prisma.product.update({
      where: { id: productId },
      data: { lowestPrice: lowest, highestPrice: highest, averagePrice: average },
    });
  }

  private summarizeByMarketplace(
    fulfilled: { provider: MarketplaceProvider; items: NormalizedProduct[] }[],
  ) {
    return fulfilled.map((g) => ({
      marketplace: { slug: g.provider.slug, name: g.provider.displayName },
      count: g.items.length,
    }));
  }

  private comparator(sort: ProductSort, query?: string) {
    return (a: any, b: any) => {
      const aLow = a.lowestPrice ?? Number.POSITIVE_INFINITY;
      const bLow = b.lowestPrice ?? Number.POSITIVE_INFINITY;
      const aHigh = a.highestPrice ?? 0;
      const bHigh = b.highestPrice ?? 0;
      const aRating = this.bestRating(a);
      const bRating = this.bestRating(b);

      switch (sort) {
        case ProductSort.CHEAPEST:
          return aLow - bLow;
        case ProductSort.EXPENSIVE:
          return bHigh - aHigh;
        case ProductSort.RATING:
          return bRating - aRating;
        case ProductSort.NEWEST:
          return +new Date(b.updatedAt) - +new Date(a.updatedAt);
        case ProductSort.RELEVANCE:
        default:
          if (!query) return 0;
          // Simple relevance: exact-match prefix > word-match > rating tiebreak
          const score = (t: string) => {
            const lower = (t ?? '').toLowerCase();
            const q = query.toLowerCase();
            if (lower === q) return 100;
            if (lower.startsWith(q)) return 80;
            if (lower.includes(q)) return 60;
            return 0;
          };
          return score(b.title) - score(a.title) || bRating - aRating;
      }
    };
  }

  private bestRating(p: any): number {
    const ratings = (p.offers ?? [])
      .map((o: any) => o.rating)
      .filter((r: any) => r != null);
    return ratings.length ? Math.max(...ratings) : 0;
  }

  private serialize(p: any) {
    const prices = (p.offers ?? []).map((o: any) => Number(o.currentPrice));
    const lowest = prices.length ? Math.min(...prices) : null;
    const highest = prices.length ? Math.max(...prices) : null;
    const average = prices.length
      ? Number((prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2))
      : null;

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      brand: p.brand,
      category: p.category,
      imageUrl: p.imageUrl,
      offers: (p.offers ?? []).map((o: any) => ({
        id: o.id,
        marketplace: {
          id: o.marketplace.id,
          slug: o.marketplace.slug,
          name: o.marketplace.name,
          logoUrl: o.marketplace.logoUrl,
        },
        externalId: o.externalId,
        url: o.externalUrl,
        currentPrice: Number(o.currentPrice),
        originalPrice: o.originalPrice ? Number(o.originalPrice) : null,
        discountPercent: o.discountPercent ? Number(o.discountPercent) : null,
        currency: o.currency,
        rating: o.rating ? Number(o.rating) : null,
        ratingCount: o.ratingCount,
        inStock: o.inStock,
        stockCount: o.stockCount,
        lastSyncedAt: o.lastSyncedAt.toISOString(),
      })),
      lowestPrice: lowest,
      highestPrice: highest,
      averagePrice: average,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
