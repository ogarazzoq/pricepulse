import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MarketplaceProvider,
  NormalizedPriceQuote,
  NormalizedProduct,
  SearchOptions,
} from './marketplace-provider.interface';

interface FakeStoreApiProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: { rate: number; count: number };
}

@Injectable()
export class FakeStoreProvider extends MarketplaceProvider {
  readonly slug = 'fakestore';
  readonly displayName = 'FakeStore';
  private readonly logger = new Logger(FakeStoreProvider.name);
  private readonly http: AxiosInstance;

  // FakeStore is a small static catalog — cache the full list for 5 minutes.
  private catalogCache: { items: FakeStoreApiProduct[]; expiresAt: number } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60_000;

  constructor() {
    super();
    this.http = axios.create({
      baseURL: 'https://fakestoreapi.com',
      timeout: 10_000,
    });
  }

  async searchProducts(query: string, opts: SearchOptions = {}): Promise<NormalizedProduct[]> {
    const all = await this.getCatalog();
    const q = query.toLowerCase();
    return all
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
      .slice(0, opts.limit ?? 30)
      .map((p) => this.normalize(p));
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    try {
      const { data } = await this.http.get<FakeStoreApiProduct>(`/products/${externalId}`);
      if (!data) return null;
      return this.normalize(data);
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      this.logger.warn(`FakeStore getProduct failed: ${err?.message}`);
      throw err;
    }
  }

  async getPrices(externalId: string): Promise<NormalizedPriceQuote> {
    const product = await this.getProduct(externalId);
    if (!product) throw new Error(`FakeStore product ${externalId} not found`);
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
    const all = await this.getCatalog();
    return all.slice(0, limit).map((p) => this.normalize(p));
  }

  // -------------------------------------------------------------------
  private async getCatalog(): Promise<FakeStoreApiProduct[]> {
    const now = Date.now();
    if (this.catalogCache && this.catalogCache.expiresAt > now) {
      return this.catalogCache.items;
    }
    try {
      const { data } = await this.http.get<FakeStoreApiProduct[]>('/products');
      this.catalogCache = { items: data, expiresAt: now + this.CACHE_TTL_MS };
      return data;
    } catch (err: any) {
      this.logger.warn(`FakeStore catalog fetch failed: ${err?.message}`);
      return this.catalogCache?.items ?? [];
    }
  }

  private normalize(p: FakeStoreApiProduct): NormalizedProduct {
    return {
      externalId: String(p.id),
      marketplaceSlug: this.slug,
      title: p.title,
      description: p.description,
      brand: null,
      category: p.category,
      imageUrl: p.image,
      url: `https://fakestoreapi.com/products/${p.id}`,
      price: Number(p.price),
      currency: 'USD',
      originalPrice: null,
      discountPercent: null,
      rating: p.rating?.rate ?? null,
      ratingCount: p.rating?.count ?? null,
      inStock: true,
      stockCount: null,
    };
  }
}
