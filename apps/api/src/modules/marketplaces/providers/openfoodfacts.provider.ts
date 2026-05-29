import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MarketplaceProvider,
  NormalizedPriceQuote,
  NormalizedProduct,
  SearchOptions,
} from './marketplace-provider.interface';

interface OpenFoodFactsProduct {
  code: string; // barcode
  product_name?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  image_front_url?: string;
  url?: string;
}

interface OpenFoodFactsSearchResponse {
  count: number;
  products: OpenFoodFactsProduct[];
}

@Injectable()
export class OpenFoodFactsProvider extends MarketplaceProvider {
  readonly slug = 'openfoodfacts';
  readonly displayName = 'Open Food Facts';
  readonly kind = 'catalog' as const;

  private readonly logger = new Logger(OpenFoodFactsProvider.name);
  private readonly http: AxiosInstance;

  constructor() {
    super();
    this.http = axios.create({
      baseURL: 'https://world.openfoodfacts.org',
      timeout: 12_000,
      headers: {
        // OFF requests a User-Agent identifying your app per their guidelines.
        'User-Agent': 'PricePulse/1.0 (https://pricepulse.io)',
      },
    });
    this.logger.log('OpenFoodFacts provider initialized (catalog-only, no prices)');
  }

  async searchProducts(query: string, opts: SearchOptions = {}): Promise<NormalizedProduct[]> {
    try {
      const { data } = await this.http.get<OpenFoodFactsSearchResponse>('/cgi/search.pl', {
        params: {
          search_terms: query,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: opts.limit ?? 20,
          fields:
            'code,product_name,generic_name,brands,categories,image_url,image_front_url,url',
        },
      });
      return (data?.products ?? [])
        .filter((p) => (p.product_name ?? p.generic_name ?? '').trim().length > 0)
        .map((p) => this.normalize(p));
    } catch (err: any) {
      this.logger.warn(`OpenFoodFacts search failed: ${err?.message}`);
      return [];
    }
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    try {
      const { data } = await this.http.get<{ status: number; product?: OpenFoodFactsProduct }>(
        `/api/v2/product/${externalId}.json`,
      );
      if (!data || data.status !== 1 || !data.product) return null;
      return this.normalize(data.product);
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      this.logger.warn(`OpenFoodFacts getProduct failed: ${err?.message}`);
      return null;
    }
  }

  /**
   * Catalog-only source has no prices. We satisfy the contract but always
   * report priceAvailable=false; consumers that need a price will skip.
   */
  async getPrices(externalId: string): Promise<NormalizedPriceQuote> {
    return {
      externalId,
      marketplaceSlug: this.slug,
      price: 0,
      priceAvailable: false,
      currency: 'USD',
      inStock: true,
      fetchedAt: new Date(),
    };
  }

  // -------------------------------------------------------------------
  private normalize(p: OpenFoodFactsProduct): NormalizedProduct {
    const title = (p.product_name ?? p.generic_name ?? '').trim();
    const category = this.firstCategory(p.categories);

    return {
      externalId: p.code,
      marketplaceSlug: this.slug,
      title,
      description: p.generic_name ?? undefined,
      brand: this.firstBrand(p.brands),
      category,
      imageUrl: p.image_front_url ?? p.image_url ?? null,
      url: p.url ?? `https://world.openfoodfacts.org/product/${p.code}`,
      // No price data available — set marker. Currency irrelevant but kept
      // non-empty to satisfy the schema.
      price: 0,
      priceAvailable: false,
      currency: 'USD',
      originalPrice: null,
      discountPercent: null,
      rating: null,
      ratingCount: null,
      inStock: true,
      stockCount: null,
      barcode: p.code,
    };
  }

  private firstBrand(brands?: string): string | null {
    if (!brands) return null;
    return brands.split(',')[0]?.trim() || null;
  }

  private firstCategory(categories?: string): string | null {
    if (!categories) return null;
    const parts = categories.split(',').map((c) => c.trim()).filter(Boolean);
    // OFF lists categories from broad to specific; the last is most specific.
    return (parts[parts.length - 1] ?? null)?.toLowerCase() ?? null;
  }
}
