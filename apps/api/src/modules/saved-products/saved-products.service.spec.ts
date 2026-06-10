import { Test, TestingModule } from '@nestjs/testing';
import { SavedProductsService } from './saved-products.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SavedProductsService', () => {
  let service: SavedProductsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    savedProduct: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockProduct = {
    id: 'product-1',
    slug: 'test-product',
    title: 'Test Product',
    imageUrl: 'https://example.com/image.jpg',
    lowestPrice: 99.99,
    offers: [{ marketplaceId: 'market-1' }, { marketplaceId: 'market-2' }],
  };

  const mockSavedProduct = {
    id: 'saved-1',
    userId: 'user-1',
    productId: 'product-1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    product: mockProduct,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SavedProductsService>(SavedProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new saved product when not already saved', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.savedProduct.findUnique.mockResolvedValue(null);
      mockPrismaService.savedProduct.create.mockResolvedValue(mockSavedProduct);

      const result = await service.create('user-1', 'product-1');

      expect(result.isNew).toBe(true);
      expect(result.data.productId).toBe('product-1');
      expect(result.data.userId).toBe('user-1');
      expect(mockPrismaService.savedProduct.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          productId: 'product-1',
        },
        include: expect.any(Object),
      });
    });

    it('should return existing saved product without creating duplicate', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.savedProduct.findUnique.mockResolvedValue(mockSavedProduct);

      const result = await service.create('user-1', 'product-1');

      expect(result.isNew).toBe(false);
      expect(result.data.productId).toBe('product-1');
      expect(result.data.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(mockPrismaService.savedProduct.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.savedProduct.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when productId is empty', async () => {
      await expect(service.create('user-1', '')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.product.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when productId is not a string', async () => {
      await expect(service.create('user-1', null as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.product.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return paginated list of saved products', async () => {
      const mockItems = [mockSavedProduct];
      mockPrismaService.savedProduct.findMany.mockResolvedValue(mockItems);
      mockPrismaService.savedProduct.count.mockResolvedValue(1);

      const result = await service.list('user-1', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(mockPrismaService.savedProduct.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should clamp pageSize to maximum of 100', async () => {
      mockPrismaService.savedProduct.findMany.mockResolvedValue([]);
      mockPrismaService.savedProduct.count.mockResolvedValue(0);

      const result = await service.list('user-1', 1, 200);

      expect(result.pageSize).toBe(100);
      expect(mockPrismaService.savedProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should default to page 1 and pageSize 20 for invalid inputs', async () => {
      mockPrismaService.savedProduct.findMany.mockResolvedValue([]);
      mockPrismaService.savedProduct.count.mockResolvedValue(0);

      const result = await service.list('user-1', -5, 0);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should calculate correct skip value for pagination', async () => {
      mockPrismaService.savedProduct.findMany.mockResolvedValue([]);
      mockPrismaService.savedProduct.count.mockResolvedValue(0);

      await service.list('user-1', 3, 10);

      expect(mockPrismaService.savedProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('remove', () => {
    it('should remove saved product for user', async () => {
      mockPrismaService.savedProduct.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove('user-1', 'product-1');

      expect(mockPrismaService.savedProduct.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          productId: 'product-1',
        },
      });
    });

    it('should not throw error if product was not saved (idempotent)', async () => {
      mockPrismaService.savedProduct.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('user-1', 'product-1')).resolves.not.toThrow();
    });
  });

  describe('count', () => {
    it('should return count of saved products for user', async () => {
      mockPrismaService.savedProduct.count.mockResolvedValue(5);

      const result = await service.count('user-1');

      expect(result).toBe(5);
      expect(mockPrismaService.savedProduct.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return 0 when user has no saved products', async () => {
      mockPrismaService.savedProduct.count.mockResolvedValue(0);

      const result = await service.count('user-1');

      expect(result).toBe(0);
    });
  });

  describe('check', () => {
    it('should return true when product is saved', async () => {
      mockPrismaService.savedProduct.findUnique.mockResolvedValue({ id: 'saved-1' });

      const result = await service.check('user-1', 'product-1');

      expect(result).toBe(true);
      expect(mockPrismaService.savedProduct.findUnique).toHaveBeenCalledWith({
        where: {
          userId_productId: {
            userId: 'user-1',
            productId: 'product-1',
          },
        },
        select: { id: true },
      });
    });

    it('should return false when product is not saved', async () => {
      mockPrismaService.savedProduct.findUnique.mockResolvedValue(null);

      const result = await service.check('user-1', 'product-1');

      expect(result).toBe(false);
    });
  });

  describe('IDOR Prevention', () => {
    it('should only operate on user-owned resources in list', async () => {
      mockPrismaService.savedProduct.findMany.mockResolvedValue([]);
      mockPrismaService.savedProduct.count.mockResolvedValue(0);

      await service.list('user-1', 1, 20);

      expect(mockPrismaService.savedProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should only operate on user-owned resources in remove', async () => {
      mockPrismaService.savedProduct.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove('user-1', 'product-1');

      expect(mockPrismaService.savedProduct.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          productId: 'product-1',
        },
      });
    });

    it('should only operate on user-owned resources in count', async () => {
      mockPrismaService.savedProduct.count.mockResolvedValue(0);

      await service.count('user-1');

      expect(mockPrismaService.savedProduct.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should only operate on user-owned resources in check', async () => {
      mockPrismaService.savedProduct.findUnique.mockResolvedValue(null);

      await service.check('user-1', 'product-1');

      expect(mockPrismaService.savedProduct.findUnique).toHaveBeenCalledWith({
        where: {
          userId_productId: {
            userId: 'user-1',
            productId: 'product-1',
          },
        },
        select: { id: true },
      });
    });
  });
});
