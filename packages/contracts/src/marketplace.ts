export interface Marketplace {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

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
  fetchedAt: string;
}

export interface SearchOptions {
  limit?: number;
  category?: string;
}
