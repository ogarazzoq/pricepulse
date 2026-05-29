/**
 * Marketplace Provider Interface
 *
 * Every external integration (FakeStore, DummyJSON, EscuelaJS, OpenFoodFacts,
 * Best Buy, Amazon, eBay, …) implements this contract. Providers are the
 * boundary between normalized internal models and external marketplace APIs.
 *
 * Two kinds of providers exist:
 *   - "marketplace" — sells products and reports prices.
 *   - "catalog"     — exposes product data without sale prices (e.g. OFF).
 *                      Implementations set priceAvailable=false on offers.
 */

export type ProviderKind = 'marketplace' | 'catalog';

export interface NormalizedProduct {
  externalId: string;
  marketplaceSlug: string;
  title: string;
  description?: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  url?: string | null;

  /** When the source has no price, set price=0 and priceAvailable=false. */
  price: number;
  priceAvailable?: boolean;
  currency: string;
  originalPrice?: number | null;
  discountPercent?: number | null;

  rating?: number | null;
  ratingCount?: number | null;
  inStock: boolean;
  stockCount?: number | null;

  /** Optional global identifiers used by enrichment + dedup. */
  barcode?: string | null;
  mpn?: string | null;
}

export interface NormalizedPriceQuote {
  externalId: string;
  marketplaceSlug: string;
  price: number;
  priceAvailable?: boolean;
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
  /** Defaults to 'marketplace' for backward compat with FakeStore/DummyJSON. */
  readonly kind: ProviderKind = 'marketplace';

  /** Toggled to false when a required env (e.g. API key) is missing. */
  get enabled(): boolean {
    return true;
  }

  abstract searchProducts(query: string, opts?: SearchOptions): Promise<NormalizedProduct[]>;
  abstract getProduct(externalId: string): Promise<NormalizedProduct | null>;
  abstract getPrices(externalId: string): Promise<NormalizedPriceQuote>;

  /** Optional — providers may override to expose a list-all for sync jobs. */
  listAll?(limit?: number): Promise<NormalizedProduct[]>;
}
