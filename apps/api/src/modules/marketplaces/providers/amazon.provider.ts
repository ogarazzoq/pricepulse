import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MarketplaceProvider,
  NormalizedPriceQuote,
  NormalizedProduct,
  SearchOptions,
} from './marketplace-provider.interface';

/**
 * Amazon Marketplace Provider (via RapidAPI Real-Time Amazon Data)
 * 
 * Integrates with Amazon using the OpenWeb Ninja Real-Time Amazon Data API
 * through RapidAPI. Provides access to real Amazon products, prices, reviews,
 * deals, and more across all 24 Amazon domains.
 * 
 * API Documentation: https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data
 * 
 * Requirements:
 * - RapidAPI account and subscription
 * - API Key (set in RAPIDAPI_KEY env variable)
 * 
 * Rate Limits:
 * - BASIC (Free): 100 requests/month, 1000 requests/hour
 * - PRO: Custom limits based on subscription
 */

interface AmazonProduct {
  asin: string;
  product_title: string;
  product_description?: string;
  product_url?: string;
  product_photo?: string;
  product_photos?: string[];
  product_price?: number;
  product_original_price?: number;
  currency?: string;
  product_star_rating?: number;
  product_num_ratings?: number;
  product_availability?: string;
  is_prime?: boolean;
  sales_volume?: string;
  delivery?: string;
  has_variations?: boolean;
}

interface AmazonSearchResponse {
  status: string;
  request_id: string;
  data: {
    products: AmazonProduct[];
    total_products?: number;
    country?: string;
    domain?: string;
  };
}

interface AmazonProductDetailsResponse {
  status: string;
  request_id: string;
  data: AmazonProduct & {
    brand?: string;
    product_details?: Record<string, any>;
    feature_bullets?: string[];
    categories?: Array<{ name: string; id: string }>;
  };
}

@Injectable()
export class AmazonProvider extends MarketplaceProvider {
  readonly slug = 'amazon';
  readonly displayName = 'Amazon';
  readonly kind = 'marketplace' as const;
  
  private readonly logger = new Logger(AmazonProvider.name);
  private readonly http: AxiosInstance;
  private readonly apiKey: string;
  private readonly country: string;

  constructor() {
    super();
    
    // Get API key from environment
    this.apiKey = process.env.RAPIDAPI_KEY || '';
    
    // Default country (can be configured per request)
    this.country = process.env.AMAZON_COUNTRY || 'US';
    
    this.http = axios.create({
      baseURL: 'https://real-time-amazon-data.p.rapidapi.com',
      timeout: 30_000, // Amazon API can be slower
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'real-time-amazon-data.p.rapidapi.com',
      },
    });

    if (!this.apiKey) {
      this.logger.warn('RAPIDAPI_KEY not set - Amazon provider will be disabled');
    } else {
      this.logger.log(`Amazon provider initialized for country: ${this.country}`);
    }
  }

  get enabled(): boolean {
    return !!this.apiKey;
  }

  async searchProducts(query: string, opts: SearchOptions = {}): Promise<NormalizedProduct[]> {
    if (!this.enabled) {
      this.logger.warn('Amazon provider disabled - missing API key');
      return [];
    }

    try {
      const limit = Math.min(opts.limit ?? 30, 100); // API max is 100
      
      const { data } = await this.http.get<AmazonSearchResponse>('/search', {
        params: {
          query,
          page: '1',
          country: this.country,
          sort_by: 'RELEVANCE',
          product_condition: 'ALL',
        },
      });

      if (data.status !== 'OK' || !data.data?.products) {
        this.logger.warn(`Amazon search returned no products for query: ${query}`);
        return [];
      }

      // Take only the requested limit
      const products = data.data.products.slice(0, limit);
      
      return products.map((p) => this.normalize(p));
    } catch (err: any) {
      // Handle rate limiting gracefully
      if (err.response?.status === 429) {
        this.logger.warn('Amazon API rate limit reached - try again later');
        return [];
      }
      
      if (err.response?.status === 403) {
        this.logger.error('Amazon API authentication failed - check RAPIDAPI_KEY');
        return [];
      }
      
      this.logger.error(`Amazon search error: ${err?.message}`);
      return [];
    }
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const { data } = await this.http.get<AmazonProductDetailsResponse>('/product-details', {
        params: {
          asin: externalId,
          country: this.country,
        },
      });

      if (data.status !== 'OK' || !data.data) {
        return null;
      }

      return this.normalize(data.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      
      if (err.response?.status === 429) {
        this.logger.warn('Amazon API rate limit reached');
        return null;
      }
      
      this.logger.warn(`Amazon getProduct failed for ASIN ${externalId}: ${err?.message}`);
      return null;
    }
  }

  async getPrices(externalId: string): Promise<NormalizedPriceQuote> {
    const product = await this.getProduct(externalId);
    
    if (!product) {
      throw new Error(`Amazon product ${externalId} not found`);
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

  /**
   * List all not supported for Amazon (would be too expensive)
   * Use search with broad queries instead
   */
  async listAll(limit = 50): Promise<NormalizedProduct[]> {
    this.logger.warn('listAll not supported for Amazon - use search instead');
    
    // Fallback: search for popular categories
    try {
      return await this.searchProducts('electronics', { limit });
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------------
  // Normalization
  // -------------------------------------------------------------------

  private normalize(p: AmazonProduct | any): NormalizedProduct {
    // Calculate discount percentage
    let discountPercent: number | null = null;
    const currentPrice = p.product_price || 0;
    const originalPrice = p.product_original_price || null;

    if (originalPrice && originalPrice > currentPrice && currentPrice > 0) {
      discountPercent = Number(((1 - currentPrice / originalPrice) * 100).toFixed(2));
    }

    // Determine stock status
    const availability = p.product_availability?.toLowerCase() || '';
    const inStock = 
      availability.includes('in stock') || 
      availability.includes('available') ||
      !!currentPrice; // If price exists, likely in stock

    // Extract brand from product details or title
    const brand = p.brand || this.extractBrandFromTitle(p.product_title);

    // Get primary image
    const imageUrl = p.product_photo || (p.product_photos && p.product_photos[0]) || null;

    // Build description
    let description = p.product_description || '';
    if (!description && p.feature_bullets) {
      description = p.feature_bullets.join(' • ');
    }

    // Extract category
    const category = p.categories && p.categories.length > 0 
      ? p.categories[0].name 
      : null;

    return {
      externalId: p.asin,
      marketplaceSlug: this.slug,
      title: p.product_title || 'Untitled Product',
      description: description || undefined,
      brand: brand || null,
      category: category || null,
      imageUrl,
      url: p.product_url || `https://www.amazon.com/dp/${p.asin}`,
      
      price: currentPrice,
      priceAvailable: currentPrice > 0,
      currency: this.normalizeCurrency(p.currency),
      originalPrice,
      discountPercent,
      
      rating: p.product_star_rating || null,
      ratingCount: p.product_num_ratings || null,
      inStock,
      stockCount: null, // Amazon doesn't provide exact count
      
      // No barcode from this API
      barcode: null,
      mpn: p.asin, // Use ASIN as manufacturer part number
    };
  }

  /**
   * Extract brand from product title (fallback)
   */
  private extractBrandFromTitle(title: string): string | null {
    if (!title) return null;
    
    // Common brand patterns
    const match = title.match(/^([A-Z][A-Za-z0-9&\s]+?)[\s-]/);
    return match ? match[1].trim() : null;
  }

  /**
   * Normalize currency code
   */
  private normalizeCurrency(currency?: string): string {
    if (!currency) {
      // Default based on country
      const currencyMap: Record<string, string> = {
        US: 'USD',
        UK: 'GBP',
        DE: 'EUR',
        FR: 'EUR',
        IT: 'EUR',
        ES: 'EUR',
        CA: 'CAD',
        JP: 'JPY',
        IN: 'INR',
        CN: 'CNY',
        BR: 'BRL',
        MX: 'MXN',
        AU: 'AUD',
      };
      return currencyMap[this.country] || 'USD';
    }
    
    return currency.toUpperCase();
  }

  /**
   * Format price for display
   */
  static formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  }
}
