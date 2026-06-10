import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all collections for a user
   */
  async list(userId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { userId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      isDefault: c.isDefault,
      productCount: c._count.products,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  /**
   * Get a single collection with its products
   */
  async findOne(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                title: true,
                imageUrl: true,
                lowestPrice: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      icon: collection.icon,
      isDefault: collection.isDefault,
      products: collection.products.map((sp) => ({
        id: sp.product.id,
        slug: sp.product.slug,
        title: sp.product.title,
        imageUrl: sp.product.imageUrl,
        lowestPrice: sp.product.lowestPrice
          ? parseFloat(sp.product.lowestPrice.toString())
          : null,
        savedAt: sp.createdAt.toISOString(),
      })),
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new collection
   */
  async create(userId: string, dto: CreateCollectionDto) {
    // Check if collection with same name already exists
    const existing = await this.prisma.collection.findUnique({
      where: {
        userId_name: {
          userId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Collection with this name already exists');
    }

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.collection.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const collection = await this.prisma.collection.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        isDefault: dto.isDefault ?? false,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    this.logger.log(`Collection created: ${collection.id} for user ${userId}`);

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      icon: collection.icon,
      isDefault: collection.isDefault,
      productCount: collection._count.products,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    };
  }

  /**
   * Update a collection
   */
  async update(userId: string, collectionId: string, dto: UpdateCollectionDto) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Check name uniqueness if changing name
    if (dto.name && dto.name !== collection.name) {
      const existing = await this.prisma.collection.findUnique({
        where: {
          userId_name: {
            userId,
            name: dto.name,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Collection with this name already exists');
      }
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.collection.updateMany({
        where: { userId, isDefault: true, id: { not: collectionId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.collection.update({
      where: { id: collectionId },
      data: dto,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      color: updated.color,
      icon: updated.icon,
      isDefault: updated.isDefault,
      productCount: updated._count.products,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete a collection
   */
  async delete(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    await this.prisma.collection.delete({
      where: { id: collectionId },
    });

    this.logger.log(`Collection deleted: ${collectionId}`);
  }

  /**
   * Add products to a collection
   */
  async addProducts(userId: string, collectionId: string, productIds: string[]) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Update saved products to belong to this collection
    const result = await this.prisma.savedProduct.updateMany({
      where: {
        userId,
        productId: { in: productIds },
      },
      data: {
        collectionId,
      },
    });

    this.logger.log(
      `Added ${result.count} products to collection ${collectionId}`,
    );

    return {
      added: result.count,
      collectionId,
    };
  }

  /**
   * Remove a product from a collection
   */
  async removeProduct(
    userId: string,
    collectionId: string,
    productId: string,
  ) {
    await this.prisma.savedProduct.updateMany({
      where: {
        userId,
        productId,
        collectionId,
      },
      data: {
        collectionId: null,
      },
    });

    this.logger.log(
      `Removed product ${productId} from collection ${collectionId}`,
    );
  }

  /**
   * Move products between collections
   */
  async moveProducts(
    userId: string,
    fromCollectionId: string,
    targetCollectionId: string | null,
    productIds: string[],
  ) {
    // Verify source collection belongs to user
    const sourceCollection = await this.prisma.collection.findFirst({
      where: { id: fromCollectionId, userId },
    });

    if (!sourceCollection) {
      throw new NotFoundException('Source collection not found');
    }

    // If target collection specified, verify it belongs to user
    if (targetCollectionId) {
      const targetCollection = await this.prisma.collection.findFirst({
        where: { id: targetCollectionId, userId },
      });

      if (!targetCollection) {
        throw new NotFoundException('Target collection not found');
      }
    }

    // Move products
    const result = await this.prisma.savedProduct.updateMany({
      where: {
        userId,
        productId: { in: productIds },
        collectionId: fromCollectionId,
      },
      data: {
        collectionId: targetCollectionId,
      },
    });

    this.logger.log(
      `Moved ${result.count} products from ${fromCollectionId} to ${targetCollectionId ?? 'uncategorized'}`,
    );

    return {
      moved: result.count,
      fromCollectionId,
      toCollectionId: targetCollectionId,
    };
  }
}
