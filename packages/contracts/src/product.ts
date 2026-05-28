import type { Marketplace } from './marketplace';

export interface ProductOffer {
  id: string;
  marketplace: Pick<Marketplace, 'id' | 'slug' | 'name' | 'logoUrl'>;
  externalId: string;
  url?: string | null;
  currentPrice: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
  currency: string;
  rating?: number | null;
  ratingCount?: number | null;
  inStock: boolean;
  stockCount?: number | null;
  lastSyncedAt: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  offers: ProductOffer[];
  lowestPrice?: number | null;
  highestPrice?: number | null;
  averagePrice?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSearchResult {
  query: string;
  results: Array<{
    marketplace: Pick<Marketplace, 'id' | 'slug' | 'name' | 'logoUrl'>;
    products: Array<{
      externalId: string;
      title: string;
      imageUrl?: string | null;
      price: number;
      currency: string;
      rating?: number | null;
      inStock: boolean;
    }>;
  }>;
}
