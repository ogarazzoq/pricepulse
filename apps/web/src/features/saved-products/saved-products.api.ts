import { api } from '@/lib/api-client';
import type {
  SavedProduct,
  SavedProductsListResponse,
  SavedProductCheckResponse,
  SavedProductCountResponse,
  CreateSavedProductInput,
} from './saved-products.types';

export interface BulkOperationResult {
  success: number;
  failed: number;
  total: number;
  successIds: string[];
  errors: Array<{ productId: string; error: string }>;
}

/**
 * Saved Products API Client
 * 
 * Client functions for interacting with the saved products endpoints.
 * All functions automatically include JWT token from auth store via axios interceptor.
 */
export const savedProductsApi = {
  /**
   * List saved products with pagination
   * 
   * @param page - Page number (default: 1)
   * @param pageSize - Items per page (default: 20, max: 100)
   * @returns Paginated list of saved products with joined product data
   */
  list: (page: number = 1, pageSize: number = 20) =>
    api
      .get<SavedProductsListResponse>('/saved', {
        params: { page, pageSize },
      })
      .then((r) => r.data),

  /**
   * Save a product (idempotent)
   * 
   * Creates a new saved product record or returns existing one.
   * Returns HTTP 201 for new records, HTTP 200 for existing.
   * 
   * @param productId - ID of the product to save
   * @returns Saved product record with joined product data
   */
  save: (productId: string) =>
    api
      .post<SavedProduct>('/saved', { productId } as CreateSavedProductInput)
      .then((r) => r.data),

  /**
   * Unsave a product
   * 
   * Removes the saved product record. No-op if not saved (returns 204 in both cases).
   * 
   * @param productId - ID of the product to unsave
   */
  unsave: (productId: string) =>
    api.delete<void>(`/saved/${productId}`).then((r) => r.data),

  /**
   * Check if a product is saved
   * 
   * @param productId - ID of the product to check
   * @returns Object with saved boolean
   */
  check: (productId: string) =>
    api
      .get<SavedProductCheckResponse>(`/saved/check/${productId}`)
      .then((r) => r.data),

  /**
   * Get count of saved products for current user
   * 
   * @returns Object with count number (0 when none saved)
   */
  count: () =>
    api.get<SavedProductCountResponse>('/saved/count').then((r) => r.data),

  /**
   * Bulk save multiple products
   * 
   * @param productIds - Array of product IDs to save (max 50)
   * @returns Bulk operation result with success/failure counts
   */
  bulkSave: (productIds: string[]) =>
    api
      .post<BulkOperationResult>('/saved/bulk/save', { productIds })
      .then((r) => r.data),

  /**
   * Bulk unsave multiple products
   * 
   * @param productIds - Array of product IDs to unsave (max 50)
   * @returns Bulk operation result with success/failure counts
   */
  bulkUnsave: (productIds: string[]) =>
    api
      .post<BulkOperationResult>('/saved/bulk/unsave', { productIds })
      .then((r) => r.data),
};
