export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isDefault: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionWithProducts extends Collection {
  products: {
    id: string;
    slug: string;
    title: string;
    imageUrl?: string;
    lowestPrice?: number;
    savedAt: string;
  }[];
}

export interface CreateCollectionDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
}

export interface UpdateCollectionDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
}

export interface AddProductsDto {
  productIds: string[];
}

export interface MoveProductsDto {
  fromCollectionId: string;
  toCollectionId: string | null;
  productIds: string[];
}
