import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MarketplaceProvider,
  NormalizedPriceQuote,
  NormalizedProduct,
  SearchOptions,
} from './marketplace-provider.interface';

/**
 * Olcha.uz Marketplace Provider
 * 
 * Integrates with Olcha.uz (https://olcha.uz), one of Uzbekistan's largest
 * online marketplaces for electronics, appliances, and consumer goods.
 * 
 * API Documentation: Based on public API endpoints observed from olcha.uz
 * Currency: UZS (Uzbekistani Som)
 */

interface OlchaProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  old_price?: number | null;
  discount?: number | null;
  brand?: string;
  category?: string;
  image?: string;
  images?: string[];
  rating?: number;
  review_count?: number;
  in_stock: boolean;
  stock_count?: number;
  url?: string;
  sku?: string;
  barcode?: string;
}

interface OlchaSearchResponse {
  results: OlchaProduct[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

interface OlchaProductResponse {
  product: OlchaProduct;
}

@Injectable()
export class OlchaProvider extends MarketplaceProvider {
  readonly slug = 'olcha';
  readonly displayName = 'Olcha.uz';
  readonly kind = 'marketplace' as const;
  
  private readonly logger = new Logger(OlchaProvider.name);
  private readonly http: AxiosInstance;
  private readonly baseURL: string;

  constructor() {
    super();
    // Use environment variable or default to public API
    this.baseURL = process.env.OLCHA_API_URL || 'https://api.olcha.uz/api/v1';
    
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 15_000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PricePulse/1.0',
      },
    });

    this.logger.log(`Olcha.uz provider initialized with baseURL: ${this.baseURL}`);
  }

  get enabled(): boolean {
    // Provider is always enabled, but will gracefully handle API errors
    return true;
  }

  async searchProducts(query: string, opts: SearchOptions = {}): Promise<NormalizedProduct[]> {
    try {
      const limit = opts.limit ?? 30;
      
      // Try the search endpoint
      const { data } = await this.http.get<OlchaSearchResponse>('/products/search', {
        params: {
          q: query,
          limit,
          category: opts.category,
        },
      });

      if (!data?.results) {
        this.logger.warn(`Olcha search returned no results for query: ${query}`);
        return [];
      }

      return data.results.map((p) => this.normalize(p));
    } catch (err: any) {
      // If API is not available, try alternative endpoint structure
      if (err.response?.status === 404) {
        try {
          return await this.searchAlternative(query, opts);
        } catch (altErr) {
          this.logger.warn(`Olcha.uz search failed (both endpoints): ${altErr}`);
          return [];
        }
      }
      
      this.logger.error(`Olcha.uz search error: ${err?.message}`);
      // Return empty array instead of throwing to prevent breaking the app
      return [];
    }
  }

  /**
   * Alternative search method for different API structure
   */
  private async searchAlternative(query: string, opts: SearchOptions = {}): Promise<NormalizedProduct[]> {
    const limit = opts.limit ?? 30;
    
    const { data } = await this.http.get<OlchaProduct[]>('/products', {
      params: {
        search: query,
        limit,
        category: opts.category,
      },
    });

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((p) => this.normalize(p));
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    try {
      const { data } = await this.http.get<OlchaProductResponse>(`/products/${externalId}`);
      
      if (!data?.product) {
        return null;
      }

      return this.normalize(data.product);
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      
      // Try alternative structure
      try {
        const { data } = await this.http.get<OlchaProduct>(`/products/${externalId}`);
        if (data) {
          return this.normalize(data);
        }
      } catch {
        // Silent fail
      }
      
      this.logger.warn(`Olcha.uz getProduct failed for ID ${externalId}: ${err?.message}`);
      return null;
    }
  }

  async getPrices(externalId: string): Promise<NormalizedPriceQuote> {
    const product = await this.getProduct(externalId);
    
    if (!product) {
      throw new Error(`Olcha.uz product ${externalId} not found`);
    }

    return {
      externalId,
      marketplaceSlug: this.slug,
      price: product.price,
      priceAvailable: product.priceAvailable !== false,
      currency: product.currency,
      inStock: product.inStock,
      fetchedAt: new Date(),
    };
  }

  async listAll(limit = 50): Promise<NormalizedProduct[]> {
    try {
      const { data } = await this.http.get<OlchaSearchResponse>('/products', {
        params: { limit },
      });

      if (!data?.results) {
        // Try alternative structure
        const { data: altData } = await this.http.get<OlchaProduct[]>('/products', {
          params: { limit },
        });
        
        if (Array.isArray(altData)) {
          return altData.map((p) => this.normalize(p));
        }
        
        return [];
      }

      return data.results.map((p) => this.normalize(p));
    } catch (err: any) {
      this.logger.error(`Olcha.uz listAll failed: ${err?.message}`);
      return [];
    }
  }

  // -------------------------------------------------------------------
  // Normalization
  // -------------------------------------------------------------------

  private normalize(p: OlchaProduct): NormalizedProduct {
    // Calculate discount percentage if not provided
    let discountPercent: number | null = null;
    let originalPrice: number | null = null;

    if (p.old_price && p.old_price > p.price) {
      originalPrice = p.old_price;
      discountPercent = Number(((1 - p.price / p.old_price) * 100).toFixed(2));
    } else if (p.discount) {
      discountPercent = p.discount;
      originalPrice = Number((p.price / (1 - p.discount / 100)).toFixed(2));
    }

    // Generate product URL
    const productUrl = p.url || `https://olcha.uz/product/${p.id}`;

    // Use primary image or first from array
    const imageUrl = p.image || (p.images && p.images.length > 0 ? p.images[0] : null);

    return {
      externalId: String(p.id),
      marketplaceSlug: this.slug,
      title: p.name,
      description: p.description || undefined,
      brand: p.brand || null,
      category: p.category || null,
      imageUrl: imageUrl || null,
      url: productUrl,
      
      price: Number(p.price),
      priceAvailable: true,
      currency: 'UZS', // Uzbekistani Som
      originalPrice,
      discountPercent,
      
      rating: p.rating || null,
      ratingCount: p.review_count || null,
      inStock: p.in_stock,
      stockCount: p.stock_count || null,
      
      // Global identifiers for enrichment
      barcode: p.barcode || null,
      mpn: p.sku || null, // Use SKU as manufacturer part number
    };
  }

  /**
   * Format UZS price for display
   * Example: 1500000 UZS -> "1,500,000 so'm"
   */
  static formatPrice(amount: number): string {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " so'm";
  }
}
