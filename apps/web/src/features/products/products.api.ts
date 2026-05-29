import { api } from '@/lib/api-client';

export interface Marketplace {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
}

export interface ProductOffer {
  id: string;
  marketplace: Marketplace;
  externalId: string;
  url?: string | null;
  currentPrice: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
  currency: string;
  priceAvailable?: boolean;
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

export type ProductSort =
  | 'relevance'
  | 'cheapest'
  | 'expensive'
  | 'rating'
  | 'newest';

export interface ProductSearchParams {
  q: string;
  sort?: ProductSort;
  marketplace?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface ProductSearchResponse {
  query: string;
  total: number;
  items: Product[];
  byMarketplace: Array<{
    marketplace: { slug: string; name: string };
    count: number;
  }>;
}

export interface ProductCatalogResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export const productsApi = {
  search: (params: ProductSearchParams) =>
    api.get<ProductSearchResponse>('/products/search', { params }).then((r) => r.data),
  list: (params: { page?: number; pageSize?: number; q?: string; sort?: ProductSort; marketplace?: string } = {}) =>
    api.get<ProductCatalogResponse>('/products', { params }).then((r) => r.data),
  byId: (id: string) => api.get<Product>(`/products/${id}`).then((r) => r.data),
};
