/**
 * Marketplace Provider Interface
 *
 * Every external integration (FakeStore, DummyJSON, Amazon, eBay, …)
 * implements this contract. Providers are the boundary between
 * normalized internal models and external marketplace APIs.
 */

export interface NormalizedProduct {
  externalId: string;
  marketplaceSlug: string;
  title: string;
  description?: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  url?: string | null;
  price: number;
  currency: string;
  originalPrice?: number | null;
  discountPercent?: number | null;
  rating?: number | null;
  ratingCount?: number | null;
  inStock: boolean;
  stockCount?: number | null;
}

export interface NormalizedPriceQuote {
  externalId: string;
  marketplaceSlug: string;
  price: number;
  currency: string;
  inStock: boolean;
  fetchedAt: Date;
}

export interface SearchOptions {
  limit?: number;
  category?: string;
}

export abstract class MarketplaceProvider {
  abstract readonly slug: string;
  abstract readonly displayName: string;

  abstract searchProducts(query: string, opts?: SearchOptions): Promise<NormalizedProduct[]>;
  abstract getProduct(externalId: string): Promise<NormalizedProduct | null>;
  abstract getPrices(externalId: string): Promise<NormalizedPriceQuote>;

  /** Optional — providers may override to expose a list-all for sync jobs. */
  listAll?(limit?: number): Promise<NormalizedProduct[]>;
}
