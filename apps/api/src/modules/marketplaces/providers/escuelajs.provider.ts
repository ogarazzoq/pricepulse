import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MarketplaceProvider,
  NormalizedPriceQuote,
  NormalizedProduct,
  SearchOptions,
} from './marketplace-provider.interface';

interface EscuelaJsCategory {
  id: number;
  name: string;
  image: string;
  slug?: string;
}

interface EscuelaJsProduct {
  id: number;
  title: string;
  slug?: string;
  price: number;
  description: string;
  category?: EscuelaJsCategory;
  images: string[];
  creationAt?: string;
  updatedAt?: string;
}

@Injectable()
export class EscuelaJsProvider extends MarketplaceProvider {
  readonly slug = 'escuelajs';
  readonly displayName = 'EscuelaJS Store';
  readonly kind = 'marketplace' as const;

  private readonly logger = new Logger(EscuelaJsProvider.name);
  private readonly http: AxiosInstance;

  constructor() {
    super();
    this.http = axios.create({
      baseURL: 'https://api.escuelajs.co/api/v1',
      timeout: 10_000,
    });
    this.logger.log('EscuelaJS provider initialized');
  }

  async searchProducts(query: string, opts: SearchOptions = {}): Promise<NormalizedProduct[]> {
    try {
      // EscuelaJS supports query string filtering via `?title=` parameter.
      const { data } = await this.http.get<EscuelaJsProduct[]>('/products', {
        params: {
          title: query,
          offset: 0,
          limit: opts.limit ?? 20,
        },
      });
      return (data ?? []).map((p) => this.normalize(p));
    } catch (err: any) {
      this.logger.warn(`EscuelaJS search failed: ${err?.message}`);
      return [];
    }
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    try {
      const { data } = await this.http.get<EscuelaJsProduct>(`/products/${externalId}`);
      return data ? this.normalize(data) : null;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      this.logger.warn(`EscuelaJS getProduct failed: ${err?.message}`);
      throw err;
    }
  }

  async getPrices(externalId: string): Promise<NormalizedPriceQuote> {
    const product = await this.getProduct(externalId);
    if (!product) throw new Error(`EscuelaJS product ${externalId} not found`);
    return {
      externalId,
      marketplaceSlug: this.slug,
      price: product.price,
      currency: product.currency,
      inStock: product.inStock,
      fetchedAt: new Date(),
    };
  }

  async listAll(limit = 50): Promise<NormalizedProduct[]> {
    try {
      const { data } = await this.http.get<EscuelaJsProduct[]>('/products', {
        params: { offset: 0, limit },
      });
      return (data ?? []).map((p) => this.normalize(p));
    } catch (err: any) {
      this.logger.warn(`EscuelaJS listAll failed: ${err?.message}`);
      return [];
    }
  }

  // -------------------------------------------------------------------
  private normalize(p: EscuelaJsProduct): NormalizedProduct {
    const image =
      p.images?.find((url) => /^https?:\/\//.test(url)) ??
      p.images?.[0] ??
      null;
    return {
      externalId: String(p.id),
      marketplaceSlug: this.slug,
      title: p.title,
      description: p.description,
      brand: null,
      category: this.mapCategory(p.category),
      imageUrl: image,
      url: `https://api.escuelajs.co/api/v1/products/${p.id}`,
      price: Number(p.price ?? 0),
      currency: 'USD',
      originalPrice: null,
      discountPercent: null,
      rating: null,
      ratingCount: null,
      inStock: true,
      stockCount: null,
    };
  }

  /**
   * EscuelaJS categories ship as objects. We surface only the human-readable
   * name and lower-case it to align with the rest of the platform.
   */
  private mapCategory(c?: EscuelaJsCategory): string | null {
    if (!c?.name) return null;
    return c.name.toLowerCase().trim();
  }
}
