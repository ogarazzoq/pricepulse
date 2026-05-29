import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MarketplaceRegistry } from '../marketplaces/marketplace.registry';
import { EnrichmentService } from '../marketplaces/enrichment.service';
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
    private readonly enrichment: EnrichmentService,
  ) {}

  // -------------------------------------------------------------------
  // Federated search across all active providers.
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

    settled
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .forEach((r) => this.logger.warn(`Search provider failed: ${r.reason?.message ?? r.reason}`));

    // Per-provider counts, used for the UI summary.
    const byMarketplace = fulfilled.map((g) => ({
      marketplace: { slug: g.provider.slug, name: g.provider.displayName },
      count: g.items.length,
    }));

    // Persist synchronously
    const persisted = new Set<string>();
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
      return { query: trimmed, total: 0, items: [], byMarketplace };
    }

    // Fire-and-forget enrichment.
    void Promise.allSettled(
      Array.from(persisted).map((id) => this.enrichment.enrichProduct(id)),
    );

    // Reload and apply filters/sort.
    let products = await this.prisma.product.findMany({
      where: { id: { in: Array.from(persisted) } },
      include: { offers: { include: { marketplace: true } } },
    });

    products = products
      .map((p) => ({
        ...p,
        offers: p.offers.filter((o) => {
          if (filters.marketplace && o.marketplace.slug !== filters.marketplace) return false;
          if (filters.inStock != null && o.inStock !== filters.inStock) return false;
          // Price filters only apply to offers with priceAvailable=true.
          if (filters.minPrice != null) {
            if (!o.priceAvailable) return false;
            if (Number(o.currentPrice) < filters.minPrice) return false;
          }
          if (filters.maxPrice != null) {
            if (!o.priceAvailable) return false;
            if (Number(o.currentPrice) > filters.maxPrice) return false;
          }
          return true;
        }),
      }))
      .filter((p) => p.offers.length > 0);

    const items = products
      .map((p) => this.serialize(p))
      .sort(this.comparator(filters.sort ?? ProductSort.RELEVANCE, trimmed))
      .slice(0, limit);

    return { query: trimmed, total: items.length, items, byMarketplace };
  }

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

    return { items: filtered, total, page, pageSize };
  }

  // -------------------------------------------------------------------
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
        // Don't overwrite existing brand/category/image with null from a partial source.
        ...(np.brand ? { brand: np.brand } : {}),
        ...(np.category ? { category: np.category } : {}),
        ...(np.imageUrl ? { imageUrl: np.imageUrl } : {}),
        ...(np.barcode ? { barcode: np.barcode } : {}),
        ...(np.mpn ? { mpn: np.mpn } : {}),
      },
      create: {
        slug,
        title: np.title,
        description: np.description,
        brand: np.brand,
        category: np.category,
        imageUrl: np.imageUrl,
        barcode: np.barcode,
        mpn: np.mpn,
      },
    });

    const priceAvailable = np.priceAvailable !== false;

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
        priceAvailable,
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
        priceAvailable,
        rating: np.rating ?? null,
        ratingCount: np.ratingCount ?? null,
        inStock: np.inStock,
        stockCount: np.stockCount ?? null,
      },
    });

    // Only record a price snapshot when the source actually has a price.
    if (priceAvailable) {
      await this.prisma.priceSnapshot.create({
        data: {
          productOfferId: offer.id,
          price: np.price,
          currency: np.currency,
          inStock: np.inStock,
        },
      });
    }

    await this.recomputeProductAggregates(product.id);
    return { product, offer };
  }

  private async recomputeProductAggregates(productId: string) {
    const offers = await this.prisma.productOffer.findMany({
      where: { productId, priceAvailable: true },
      select: { currentPrice: true },
    });
    if (offers.length === 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { lowestPrice: null, highestPrice: null, averagePrice: null },
      });
      return;
    }
    const prices = offers.map((o) => Number(o.currentPrice));
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const average = Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2));
    await this.prisma.product.update({
      where: { id: productId },
      data: { lowestPrice: lowest, highestPrice: highest, averagePrice: average },
    });
  }

  /**
   * Sort comparator. For price-based sorts, products without any priced offer
   * (lowestPrice null) sink to the bottom regardless of direction.
   */
  private comparator(sort: ProductSort, query?: string) {
    return (a: any, b: any) => {
      const aPriced = a.lowestPrice != null;
      const bPriced = b.lowestPrice != null;
      const aLow = aPriced ? a.lowestPrice : Number.POSITIVE_INFINITY;
      const bLow = bPriced ? b.lowestPrice : Number.POSITIVE_INFINITY;
      const aHigh = aPriced ? a.highestPrice ?? 0 : -1;
      const bHigh = bPriced ? b.highestPrice ?? 0 : -1;
      const aRating = this.bestRating(a);
      const bRating = this.bestRating(b);

      switch (sort) {
        case ProductSort.CHEAPEST:
          if (aPriced !== bPriced) return aPriced ? -1 : 1;
          return aLow - bLow;
        case ProductSort.EXPENSIVE:
          if (aPriced !== bPriced) return aPriced ? -1 : 1;
          return bHigh - aHigh;
        case ProductSort.RATING:
          return bRating - aRating;
        case ProductSort.NEWEST:
          return +new Date(b.updatedAt) - +new Date(a.updatedAt);
        case ProductSort.RELEVANCE:
        default:
          if (!query) return 0;
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
    const pricedOffers = (p.offers ?? []).filter((o: any) => o.priceAvailable !== false);
    const prices = pricedOffers.map((o: any) => Number(o.currentPrice));
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
      barcode: p.barcode ?? null,
      mpn: p.mpn ?? null,
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
        priceAvailable: o.priceAvailable !== false,
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
