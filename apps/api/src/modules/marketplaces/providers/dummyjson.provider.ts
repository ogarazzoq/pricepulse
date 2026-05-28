import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MarketplaceProvider,
  NormalizedPriceQuote,
  NormalizedProduct,
  SearchOptions,
} from './marketplace-provider.interface';

interface DummyJsonProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  brand?: string;
  category: string;
  thumbnail: string;
  images: string[];
}

interface DummyJsonResponse {
  products: DummyJsonProduct[];
  total: number;
  skip: number;
  limit: number;
}

@Injectable()
export class DummyJsonProvider extends MarketplaceProvider {
  readonly slug = 'dummyjson';
  readonly displayName = 'DummyJSON';
  private readonly logger = new Logger(DummyJsonProvider.name);
  private readonly http: AxiosInstance;

  constructor() {
    super();
    this.http = axios.create({
      baseURL: 'https://dummyjson.com',
      timeout: 10_000,
    });
  }

  async searchProducts(query: string, opts: SearchOptions = {}): Promise<NormalizedProduct[]> {
    const { data } = await this.http.get<DummyJsonResponse>('/products/search', {
      params: { q: query, limit: opts.limit ?? 30 },
    });
    return data.products.map((p) => this.normalize(p));
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    try {
      const { data } = await this.http.get<DummyJsonProduct>(`/products/${externalId}`);
      if (!data) return null;
      return this.normalize(data);
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      this.logger.warn(`DummyJSON getProduct failed: ${err?.message}`);
      throw err;
    }
  }

  async getPrices(externalId: string): Promise<NormalizedPriceQuote> {
    const product = await this.getProduct(externalId);
    if (!product) throw new Error(`DummyJSON product ${externalId} not found`);
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
    const { data } = await this.http.get<DummyJsonResponse>('/products', {
      params: { limit },
    });
    return data.products.map((p) => this.normalize(p));
  }

  // -------------------------------------------------------------------
  private normalize(p: DummyJsonProduct): NormalizedProduct {
    const original =
      p.discountPercentage > 0 ? Number((p.price / (1 - p.discountPercentage / 100)).toFixed(2)) : null;

    return {
      externalId: String(p.id),
      marketplaceSlug: this.slug,
      title: p.title,
      description: p.description,
      brand: p.brand ?? null,
      category: p.category,
      imageUrl: p.thumbnail,
      url: `https://dummyjson.com/products/${p.id}`,
      price: Number(p.price),
      currency: 'USD',
      originalPrice: original,
      discountPercent: p.discountPercentage ? Number(p.discountPercentage.toFixed(2)) : null,
      rating: p.rating ?? null,
      ratingCount: null,
      inStock: p.stock > 0,
      stockCount: p.stock,
    };
  }
}
