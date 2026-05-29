/**
 * EnrichmentProvider — third-party metadata sources that augment products
 * but do NOT participate in the price-comparison search aggregation.
 *
 * Examples: UPC Item DB, Google Knowledge Graph, manufacturer SDKs.
 *
 * The aggregation pipeline calls each enricher AFTER a product is upserted
 * from a marketplace, in best-effort mode. Failures are logged and ignored.
 */

export interface EnrichmentResult {
  /** Optional fields the enricher was able to resolve. */
  brand?: string | null;
  category?: string | null;
  barcode?: string | null;
  mpn?: string | null;
  imageUrl?: string | null;
  description?: string | null;
}

export interface EnrichmentInput {
  productId: string;
  title: string;
  brand?: string | null;
  barcode?: string | null;
  mpn?: string | null;
}

export abstract class EnrichmentProvider {
  abstract readonly slug: string;
  abstract readonly displayName: string;

  get enabled(): boolean {
    return true;
  }

  abstract enrich(input: EnrichmentInput): Promise<EnrichmentResult | null>;
}
