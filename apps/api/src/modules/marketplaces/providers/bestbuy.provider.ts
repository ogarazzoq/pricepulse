import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  MarketplaceProvider,
  NormalizedPriceQuote,
  NormalizedProduct,
  SearchOptions,
} from './marketplace-provider.interface';

interface BestBuyProduct {
  sku: number;
  productId?: number;
  name: string;
  manufacturer?: string;
  modelNumber?: string;
  upc?: string;
  regularPrice?: number;
  salePrice?: number;
  onSale?: boolean;
  customerReviewAverage?: number;
  customerReviewCount?: number;
  inStoreAvailability?: boolean;
  onlineAvailability?: boolean;
  url?: string;
  image?: string;
  thumbnailImage?: string;
  shortDescription?: string;
  longDescription?: string;
  categoryPath?: { id: string; name: string }[];
}

interface BestBuySearchResponse {
  total: number;
  products: BestBuyProduct[];
}

@Injectable()
export class BestBuyProvider extends MarketplaceProvider {
  readonly slug = 'bestbuy';
  readonly displayName = 'Best Buy';
  readonly kind = 'marketplace' as const;

  private readonly logger = new Logger(BestBuyProvider.name);
  private readonly http: AxiosInstance;
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey = this.config.get<string>('BESTBUY_API_KEY')?.trim() || undefined;
    this.http = axios.create({
      baseURL: 'https://api.bestbuy.com/v1',
      timeout: 12_000,
    });
    if (this.apiKey) {
      this.logger.log('BestBuy provider initialized with API key');
    } else {
      this.logger.warn('BestBuy provider initialized WITHOUT API key — calls will be skipped');
    }
  }

  override get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  async searchProducts(query: string, opts: SearchOptions = {}): Promise<NormalizedProduct[]> {
    if (!this.enabled) return [];
    try {
      // Best Buy uses a parenthesized query DSL; search_term goes into `search`.
      const filter = `(search=${encodeURIComponent(query)})`;
      const { data } = await this.http.get<BestBuySearchResponse>(`/products${filter}.json`, {
        params: this.params({ pageSize: opts.limit ?? 20, page: 1 }),
      });
      return (data?.products ?? []).map((p) => this.normalize(p));
    } catch (err: any) {
      this.logger.warn(`BestBuy search failed: ${err?.message}`);
      return [];
    }
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    if (!this.enabled) return null;
    try {
      const { data } = await this.http.get<BestBuyProduct>(
        `/products/${externalId}.json`,
        { params: this.params({}) },
      );
      return data ? this.normalize(data) : null;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      this.logger.warn(`BestBuy getProduct failed: ${err?.message}`);
      return null;
    }
  }

  async getPrices(externalId: string): Promise<NormalizedPriceQuote> {
    if (!this.enabled) {
      throw new Error('BestBuy provider is disabled (no API key)');
    }
    const product = await this.getProduct(externalId);
    if (!product) throw new Error(`BestBuy product ${externalId} not found`);
    return {
      externalId,
      marketplaceSlug: this.slug,
      price: product.price,
      currency: product.currency,
      inStock: product.inStock,
      fetchedAt: new Date(),
    };
  }

  // -------------------------------------------------------------------
  private params(extra: Record<string, string | number | undefined>) {
    return { ...extra, format: 'json', apiKey: this.apiKey };
  }

  private normalize(p: BestBuyProduct): NormalizedProduct {
    const onSale = Boolean(p.onSale && p.salePrice && p.regularPrice && p.salePrice < p.regularPrice);
    const price = Number(p.salePrice ?? p.regularPrice ?? 0);
    const original = onSale ? Number(p.regularPrice) : null;
    const discount =
      onSale && p.regularPrice && p.salePrice
        ? Number((((p.regularPrice - p.salePrice) / p.regularPrice) * 100).toFixed(2))
        : null;

    const category =
      p.categoryPath && p.categoryPath.length > 0
        ? p.categoryPath[p.categoryPath.length - 1]?.name?.toLowerCase().trim()
        : null;

    return {
      externalId: String(p.sku),
      marketplaceSlug: this.slug,
      title: p.name,
      description: p.shortDescription ?? p.longDescription ?? undefined,
      brand: p.manufacturer ?? null,
      category: category ?? null,
      imageUrl: p.image ?? p.thumbnailImage ?? null,
      url: p.url ?? null,
      price,
      currency: 'USD',
      originalPrice: original,
      discountPercent: discount,
      rating: p.customerReviewAverage ?? null,
      ratingCount: p.customerReviewCount ?? null,
      inStock: Boolean(p.onlineAvailability ?? p.inStoreAvailability ?? true),
      stockCount: null,
      barcode: p.upc ?? null,
      mpn: p.modelNumber ?? null,
    };
  }
}
