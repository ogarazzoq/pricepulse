/**
 * Response DTO for a saved product with joined product details.
 * Includes all necessary product information to avoid N+1 queries.
 */
export interface SavedProductDto {
  id: string;
  userId: string;
  productId: string;
  product: {
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
    lowestPrice: number | null;
    currency: string;
    marketplaceCount: number;
  };
  createdAt: string;
}
