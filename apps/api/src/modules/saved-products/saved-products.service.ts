import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SavedProductDto } from './dto/saved-product.dto';
import { SavedProductListDto } from './dto/saved-product-list.dto';
import { BulkOperationResultDto } from './dto/bulk-save.dto';

@Injectable()
export class SavedProductsService {
  private readonly logger = new Logger(SavedProductsService.name);
  
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or return existing SavedProduct (idempotent).
   * Returns HTTP 201 for new, HTTP 200 for existing (controller handles status codes).
   * Throws NotFoundException if productId doesn't exist.
   * @param userId - Owner ID from JWT
   * @param productId - Product ID to save
   * @returns SavedProductDto with joined product data
   */
  async create(
    userId: string,
    productId: string,
  ): Promise<{ data: SavedProductDto; isNew: boolean }> {
    // Validate productId is not empty
    if (!productId || typeof productId !== 'string' || !productId.trim()) {
      throw new BadRequestException('productId is required and must be a non-empty string');
    }

    // Check if product exists
    const productExists = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!productExists) {
      throw new NotFoundException('Product not found');
    }

    // Check if already saved
    const existing = await this.prisma.savedProduct.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            slug: true,
            title: true,
            imageUrl: true,
            lowestPrice: true,
            offers: {
              select: {
                marketplaceId: true,
              },
              distinct: ['marketplaceId'],
            },
          },
        },
      },
    });

    if (existing) {
      // Return existing row without mutating createdAt
      return {
        data: this.serializeSavedProduct(existing),
        isNew: false,
      };
    }

    // Create new SavedProduct
    const savedProduct = await this.prisma.savedProduct.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            slug: true,
            title: true,
            imageUrl: true,
            lowestPrice: true,
            offers: {
              select: {
                marketplaceId: true,
              },
              distinct: ['marketplaceId'],
            },
          },
        },
      },
    });

    return {
      data: this.serializeSavedProduct(savedProduct),
      isNew: true,
    };
  }

  /**
   * List saved products with pagination.
   * Ordered by createdAt descending.
   * Includes joined product data to avoid N+1 queries.
   * @param userId - Owner ID from JWT
   * @param page - Page number (1-indexed)
   * @param pageSize - Items per page (clamped to 1-100)
   * @returns Paginated list of SavedProductDto
   */
  async list(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<SavedProductListDto> {
    // Sanitize pagination params
    const sanitizedPage = Math.max(1, Math.floor(page) || 1);
    const sanitizedPageSize = Math.max(1, Math.min(100, Math.floor(pageSize) || 20));
    const skip = (sanitizedPage - 1) * sanitizedPageSize;

    // Query saved products with product join
    const [items, total] = await Promise.all([
      this.prisma.savedProduct.findMany({
        where: { userId },
        skip,
        take: sanitizedPageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              title: true,
              imageUrl: true,
              lowestPrice: true,
              offers: {
                select: {
                  marketplaceId: true,
                },
                distinct: ['marketplaceId'],
              },
            },
          },
        },
      }),
      this.prisma.savedProduct.count({
        where: { userId },
      }),
    ]);

    return {
      items: items.map((item) => this.serializeSavedProduct(item)),
      total,
      page: sanitizedPage,
      pageSize: sanitizedPageSize,
    };
  }

  /**
   * Remove a saved product (no-op if not found).
   * Always succeeds (idempotent delete).
   * @param userId - Owner ID from JWT
   * @param productId - Product ID to unsave
   */
  async remove(userId: string, productId: string): Promise<void> {
    // Delete only if owned by user (IDOR prevention)
    await this.prisma.savedProduct.deleteMany({
      where: {
        userId,
        productId,
      },
    });
    // No error if not found - idempotent delete
  }

  /**
   * Count total saved products for user.
   * @param userId - Owner ID from JWT
   * @returns Total count (non-negative integer)
   */
  async count(userId: string): Promise<number> {
    return this.prisma.savedProduct.count({
      where: { userId },
    });
  }

  /**
   * Check if a product is saved by user.
   * @param userId - Owner ID from JWT
   * @param productId - Product ID to check
   * @returns Boolean saved status
   */
  async check(userId: string, productId: string): Promise<boolean> {
    const saved = await this.prisma.savedProduct.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      select: { id: true },
    });

    return !!saved;
  }

  /**
   * Serialize SavedProduct with joined product data to DTO.
   * Computes marketplaceCount from distinct offers.
   * @param savedProduct - Prisma result with product join
   * @returns SavedProductDto
   */
  private serializeSavedProduct(savedProduct: any): SavedProductDto {
    const { product } = savedProduct;

    // Get currency from product or default to USD
    // Note: Prisma doesn't have a currency field on Product, using offers
    const currency = 'USD'; // Default, can be enhanced by querying offers

    return {
      id: savedProduct.id,
      userId: savedProduct.userId,
      productId: savedProduct.productId,
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        imageUrl: product.imageUrl,
        lowestPrice: product.lowestPrice ? parseFloat(product.lowestPrice.toString()) : null,
        currency,
        marketplaceCount: product.offers?.length || 0,
      },
      createdAt: savedProduct.createdAt.toISOString(),
    };
  }

  /**
   * Bulk save multiple products.
   * Processes each product individually and returns success/failure report.
   * @param userId - Owner ID from JWT
   * @param productIds - Array of product IDs to save (max 50)
   * @returns BulkOperationResultDto with success/failure counts
   */
  async bulkSave(
    userId: string,
    productIds: string[],
  ): Promise<BulkOperationResultDto> {
    const results: BulkOperationResultDto = {
      success: 0,
      failed: 0,
      total: productIds.length,
      successIds: [],
      errors: [],
    };

    // Process each product
    for (const productId of productIds) {
      try {
        await this.create(userId, productId);
        results.success++;
        results.successIds.push(productId);
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          productId,
          error: error.message || 'Unknown error',
        });
        this.logger.warn(
          `Failed to save product ${productId} for user ${userId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Bulk save completed: ${results.success}/${results.total} succeeded for user ${userId}`,
    );

    return results;
  }

  /**
   * Bulk unsave multiple products.
   * Processes each product individually and always succeeds (idempotent).
   * @param userId - Owner ID from JWT
   * @param productIds - Array of product IDs to unsave (max 50)
   * @returns BulkOperationResultDto with success count
   */
  async bulkUnsave(
    userId: string,
    productIds: string[],
  ): Promise<BulkOperationResultDto> {
    const results: BulkOperationResultDto = {
      success: 0,
      failed: 0,
      total: productIds.length,
      successIds: [],
      errors: [],
    };

    // Process each product (idempotent delete)
    for (const productId of productIds) {
      try {
        await this.remove(userId, productId);
        results.success++;
        results.successIds.push(productId);
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          productId,
          error: error.message || 'Unknown error',
        });
        this.logger.warn(
          `Failed to unsave product ${productId} for user ${userId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Bulk unsave completed: ${results.success}/${results.total} succeeded for user ${userId}`,
    );

    return results;
  }
}
