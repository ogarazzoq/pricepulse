import { Test, TestingModule } from '@nestjs/testing';
import { SavedProductsController } from './saved-products.controller';
import { SavedProductsService } from './saved-products.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { CreateSavedProductDto } from './dto/create-saved-product.dto';
import { Response } from 'express';
import { HttpStatus } from '@nestjs/common';

describe('SavedProductsController', () => {
  let controller: SavedProductsController;
  let service: SavedProductsService;

  const mockJwtPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'USER' as any,
  };

  const mockService = {
    create: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    check: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedProductsController],
      providers: [
        {
          provide: SavedProductsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SavedProductsController>(SavedProductsController);
    service = module.get<SavedProductsService>(SavedProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should call service.list with userId and pagination params', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
      mockService.list.mockResolvedValue(mockResult);

      const result = await controller.list(mockJwtPayload, {
        page: 1,
        pageSize: 20,
      });

      expect(service.list).toHaveBeenCalledWith('user-123', 1, 20);
      expect(result).toEqual(mockResult);
    });

    it('should use default pagination when not provided', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
      mockService.list.mockResolvedValue(mockResult);

      await controller.list(mockJwtPayload, {});

      expect(service.list).toHaveBeenCalledWith('user-123', 1, 20);
    });
  });

  describe('create', () => {
    it('should return 201 for new saved product', async () => {
      const dto: CreateSavedProductDto = { productId: 'prod-123' };
      const mockData = {
        id: 'saved-1',
        userId: 'user-123',
        productId: 'prod-123',
        product: {
          id: 'prod-123',
          slug: 'test-product',
          title: 'Test Product',
          imageUrl: null,
          lowestPrice: 99.99,
          currency: 'USD',
          marketplaceCount: 1,
        },
        createdAt: new Date().toISOString(),
      };

      mockService.create.mockResolvedValue({ data: mockData, isNew: true });

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.create(mockJwtPayload, dto, mockResponse);

      expect(service.create).toHaveBeenCalledWith('user-123', 'prod-123');
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith(mockData);
    });

    it('should return 200 for existing saved product', async () => {
      const dto: CreateSavedProductDto = { productId: 'prod-123' };
      const mockData = {
        id: 'saved-1',
        userId: 'user-123',
        productId: 'prod-123',
        product: {
          id: 'prod-123',
          slug: 'test-product',
          title: 'Test Product',
          imageUrl: null,
          lowestPrice: 99.99,
          currency: 'USD',
          marketplaceCount: 1,
        },
        createdAt: new Date().toISOString(),
      };

      mockService.create.mockResolvedValue({ data: mockData, isNew: false });

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.create(mockJwtPayload, dto, mockResponse);

      expect(service.create).toHaveBeenCalledWith('user-123', 'prod-123');
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockData);
    });
  });

  describe('remove', () => {
    it('should call service.remove with userId and productId', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(mockJwtPayload, 'prod-123');

      expect(service.remove).toHaveBeenCalledWith('user-123', 'prod-123');
    });
  });

  describe('count', () => {
    it('should return count object', async () => {
      mockService.count.mockResolvedValue(5);

      const result = await controller.count(mockJwtPayload);

      expect(service.count).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ count: 5 });
    });

    it('should return 0 when no saved products', async () => {
      mockService.count.mockResolvedValue(0);

      const result = await controller.count(mockJwtPayload);

      expect(service.count).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ count: 0 });
    });
  });

  describe('check', () => {
    it('should return saved true when product is saved', async () => {
      mockService.check.mockResolvedValue(true);

      const result = await controller.check(mockJwtPayload, 'prod-123');

      expect(service.check).toHaveBeenCalledWith('user-123', 'prod-123');
      expect(result).toEqual({ saved: true });
    });

    it('should return saved false when product is not saved', async () => {
      mockService.check.mockResolvedValue(false);

      const result = await controller.check(mockJwtPayload, 'prod-123');

      expect(service.check).toHaveBeenCalledWith('user-123', 'prod-123');
      expect(result).toEqual({ saved: false });
    });
  });
});
