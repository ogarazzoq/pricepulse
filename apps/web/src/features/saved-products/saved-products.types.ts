/**
 * Saved Products Feature Type Definitions
 * 
 * Types for the Saved Products feature that allows users to heart/save
 * products for later reference.
 */

/**
 * Product summary included in SavedProduct responses to avoid N+1 queries
 */
export interface SavedProductProduct {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  lowestPrice: number | null;
  currency: string;
  marketplaceCount: number;
}

/**
 * Saved product record representing a (user, product) pair
 */
export interface SavedProduct {
  id: string;
  userId: string;
  productId: string;
  product: SavedProductProduct;
  createdAt: string;
}

/**
 * Input DTO for creating a saved product
 */
export interface CreateSavedProductInput {
  productId: string;
}

/**
 * Paginated response for listing saved products
 */
export interface SavedProductsListResponse {
  items: SavedProduct[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Response for checking if a product is saved
 */
export interface SavedProductCheckResponse {
  saved: boolean;
}

/**
 * Response for getting saved products count
 */
export interface SavedProductCountResponse {
  count: number;
}
