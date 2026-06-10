import { api } from '@/lib/api-client';
import type {
  Collection,
  CollectionWithProducts,
  CreateCollectionDto,
  UpdateCollectionDto,
  AddProductsDto,
  MoveProductsDto,
} from './collections.types';

export const collectionsApi = {
  /**
   * List all collections for the current user
   */
  async list(): Promise<Collection[]> {
    const res = await api.get('/collections');
    return res.data;
  },

  /**
   * Get a single collection with its products
   */
  async findOne(collectionId: string): Promise<CollectionWithProducts> {
    const res = await api.get(`/collections/${collectionId}`);
    return res.data;
  },

  /**
   * Create a new collection
   */
  async create(dto: CreateCollectionDto): Promise<Collection> {
    const res = await api.post('/collections', dto);
    return res.data;
  },

  /**
   * Update a collection
   */
  async update(collectionId: string, dto: UpdateCollectionDto): Promise<Collection> {
    const res = await api.patch(`/collections/${collectionId}`, dto);
    return res.data;
  },

  /**
   * Delete a collection
   */
  async delete(collectionId: string): Promise<void> {
    await api.delete(`/collections/${collectionId}`);
  },

  /**
   * Add products to a collection
   */
  async addProducts(collectionId: string, dto: AddProductsDto): Promise<{ added: number; collectionId: string }> {
    const res = await api.post(`/collections/${collectionId}/products`, dto);
    return res.data;
  },

  /**
   * Remove a product from a collection
   */
  async removeProduct(collectionId: string, productId: string): Promise<void> {
    await api.delete(`/collections/${collectionId}/products/${productId}`);
  },

  /**
   * Move products between collections
   */
  async moveProducts(dto: MoveProductsDto): Promise<{ moved: number; fromCollectionId: string; toCollectionId: string | null }> {
    const res = await api.post(`/collections/${dto.fromCollectionId}/move`, {
      targetCollectionId: dto.toCollectionId,
      productIds: dto.productIds,
    });
    return res.data;
  },
};
