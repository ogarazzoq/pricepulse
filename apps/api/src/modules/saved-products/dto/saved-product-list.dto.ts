import { SavedProductDto } from './saved-product.dto';

/**
 * Paginated response for listing saved products.
 * Includes items array, total count, and pagination metadata.
 */
export interface SavedProductListDto {
  items: SavedProductDto[];
  total: number;
  page: number;
  pageSize: number;
}
