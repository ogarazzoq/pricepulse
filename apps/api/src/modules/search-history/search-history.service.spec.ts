import { Test, TestingModule } from '@nestjs/testing';
import { SearchHistoryService } from './search-history.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { normalizeQuery } from './search-history.utils';

describe('SearchHistoryService', () => {
  let service: SearchHistoryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    searchHistory: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockSearchHistory = {
    id: 'search-1',
    userId: 'user-1',
    query: 'Wireless Headphones',
    normalizedQuery: 'wireless headphones',
    searchCount: 1,
    lastSearchedAt: new Date('2024-01-15T10:00:00Z'),
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchHistoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SearchHistoryService>(SearchHistoryService);
    prisma = module.get<PrismaService>(PrismaService);

    // Default transaction mock to execute callback immediately
    mockPrismaService.$transaction.mockImplementation(async (callback) => {
      return callback(mockPrismaService);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('capture', () => {
    it('should create a new search entry when query is new', async () => {
      const query = 'Wireless Headphones';
      const normalized = normalizeQuery(query);

      mockPrismaService.searchHistory.count.mockResolvedValue(0);
      mockPrismaService.searchHistory.upsert.mockResolvedValue({
        ...mockSearchHistory,
        query,
        normalizedQuery: normalized,
      });

      const result = await service.capture('user-1', query);

      expect(result.query).toBe(query);
      expect(result.normalizedQuery).toBe(normalized);
      expect(result.searchCount).toBe(1);
      expect(mockPrismaService.searchHistory.upsert).toHaveBeenCalled();
    });

    it('should increment searchCount when query already exists', async () => {
      const query = 'wireless headphones';
      const normalized = normalizeQuery(query);

      mockPrismaService.searchHistory.count.mockResolvedValue(1);
      mockPrismaService.searchHistory.upsert.mockResolvedValue({
        ...mockSearchHistory,
        query,
        normalizedQuery: normalized,
        searchCount: 2,
      });

      const result = await service.capture('user-1', query);

      expect(result.searchCount).toBe(2);
    });

    it('should normalize query for deduplication', async () => {
      const query1 = '  Wireless   Headphones  ';
      const query2 = 'wireless headphones';

      mockPrismaService.searchHistory.count.mockResolvedValue(0);
      mockPrismaService.searchHistory.upsert.mockResolvedValue(mockSearchHistory);

      await service.capture('user-1', query1);

      const upsertCall = mockPrismaService.searchHistory.upsert.mock.calls[0][0];
      expect(upsertCall.where.userId_normalizedQuery.normalizedQuery).toBe(
        normalizeQuery(query2),
      );
    });

    it('should update query to latest casing on duplicate', async () => {
      mockPrismaService.searchHistory.count.mockResolvedValue(1);
      mockPrismaService.searchHistory.upsert.mockResolvedValue({
        ...mockSearchHistory,
        query: 'WIRELESS HEADPHONES',
      });

      const result = await service.capture('user-1', 'WIRELESS HEADPHONES');

      expect(result.query).toBe('WIRELESS HEADPHONES');
    });

    it('should evict oldest entry when at cap', async () => {
      process.env.SEARCH_HISTORY_MAX_PER_USER = '2';
      const oldestEntry = {
        id: 'old-search',
        lastSearchedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPrismaService.searchHistory.count.mockResolvedValue(2);
      mockPrismaService.searchHistory.findFirst.mockResolvedValue(oldestEntry);
      mockPrismaService.searchHistory.delete.mockResolvedValue(oldestEntry);
      mockPrismaService.searchHistory.upsert.mockResolvedValue(mockSearchHistory);

      await service.capture('user-1', 'new search');

      expect(mockPrismaService.searchHistory.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [{ lastSearchedAt: 'asc' }, { id: 'asc' }],
      });
      expect(mockPrismaService.searchHistory.delete).toHaveBeenCalledWith({
        where: { id: 'old-search' },
      });

      delete process.env.SEARCH_HISTORY_MAX_PER_USER;
    });

    it('should not evict when below cap', async () => {
      process.env.SEARCH_HISTORY_MAX_PER_USER = '100';

      mockPrismaService.searchHistory.count.mockResolvedValue(50);
      mockPrismaService.searchHistory.upsert.mockResolvedValue(mockSearchHistory);

      await service.capture('user-1', 'test query');

      expect(mockPrismaService.searchHistory.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.searchHistory.delete).not.toHaveBeenCalled();

      delete process.env.SEARCH_HISTORY_MAX_PER_USER;
    });

    it('should use default cap of 100 when env not set', async () => {
      delete process.env.SEARCH_HISTORY_MAX_PER_USER;

      mockPrismaService.searchHistory.count.mockResolvedValue(99);
      mockPrismaService.searchHistory.upsert.mockResolvedValue(mockSearchHistory);

      await service.capture('user-1', 'test');

      // Should not evict at 99
      expect(mockPrismaService.searchHistory.findFirst).not.toHaveBeenCalled();
    });

    it('should clamp cap to minimum of 10', async () => {
      process.env.SEARCH_HISTORY_MAX_PER_USER = '5';

      mockPrismaService.searchHistory.count.mockResolvedValue(10);
      mockPrismaService.searchHistory.findFirst.mockResolvedValue({
        id: 'old',
        lastSearchedAt: new Date(),
      });
      mockPrismaService.searchHistory.delete.mockResolvedValue({});
      mockPrismaService.searchHistory.upsert.mockResolvedValue(mockSearchHistory);

      await service.capture('user-1', 'test');

      // Cap should be clamped to 10, so eviction should happen at 10
      expect(mockPrismaService.searchHistory.findFirst).toHaveBeenCalled();

      delete process.env.SEARCH_HISTORY_MAX_PER_USER;
    });

    it('should clamp cap to maximum of 1000', async () => {
      process.env.SEARCH_HISTORY_MAX_PER_USER = '2000';

      mockPrismaService.searchHistory.count.mockResolvedValue(999);
      mockPrismaService.searchHistory.upsert.mockResolvedValue(mockSearchHistory);

      await service.capture('user-1', 'test');

      // Should not evict at 999 (clamped to 1000)
      expect(mockPrismaService.searchHistory.findFirst).not.toHaveBeenCalled();

      delete process.env.SEARCH_HISTORY_MAX_PER_USER;
    });

    it('should use default cap when env value is invalid', async () => {
      process.env.SEARCH_HISTORY_MAX_PER_USER = 'invalid';

      mockPrismaService.searchHistory.count.mockResolvedValue(50);
      mockPrismaService.searchHistory.upsert.mockResolvedValue(mockSearchHistory);

      await service.capture('user-1', 'test');

      // Should use default of 100
      expect(mockPrismaService.searchHistory.findFirst).not.toHaveBeenCalled();

      delete process.env.SEARCH_HISTORY_MAX_PER_USER;
    });
  });

  describe('list', () => {
    it('should return paginated search history', async () => {
      const mockItems = [mockSearchHistory];
      mockPrismaService.searchHistory.findMany.mockResolvedValue(mockItems);
      mockPrismaService.searchHistory.count.mockResolvedValue(1);

      const result = await service.list('user-1', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { lastSearchedAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should calculate correct skip value for pagination', async () => {
      mockPrismaService.searchHistory.findMany.mockResolvedValue([]);
      mockPrismaService.searchHistory.count.mockResolvedValue(0);

      await service.list('user-1', 3, 10);

      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('should order by lastSearchedAt descending', async () => {
      mockPrismaService.searchHistory.findMany.mockResolvedValue([]);
      mockPrismaService.searchHistory.count.mockResolvedValue(0);

      await service.list('user-1', 1, 20);

      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { lastSearchedAt: 'desc' },
        }),
      );
    });

    it('should return empty array when no searches exist', async () => {
      mockPrismaService.searchHistory.findMany.mockResolvedValue([]);
      mockPrismaService.searchHistory.count.mockResolvedValue(0);

      const result = await service.list('user-1', 1, 20);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getRecent', () => {
    it('should return most recent searches ordered by lastSearchedAt', async () => {
      const mockItems = [
        { ...mockSearchHistory, id: 'search-1', lastSearchedAt: new Date('2024-01-15T10:00:00Z') },
        { ...mockSearchHistory, id: 'search-2', lastSearchedAt: new Date('2024-01-14T10:00:00Z') },
      ];
      mockPrismaService.searchHistory.findMany.mockResolvedValue(mockItems);

      const result = await service.getRecent('user-1', 5);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { lastSearchedAt: 'desc' },
        take: 5,
      });
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.searchHistory.findMany.mockResolvedValue([]);

      await service.getRecent('user-1', 10);

      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('getTop', () => {
    it('should return most frequent searches ordered by searchCount', async () => {
      const mockItems = [
        { ...mockSearchHistory, id: 'search-1', searchCount: 10 },
        { ...mockSearchHistory, id: 'search-2', searchCount: 5 },
      ];
      mockPrismaService.searchHistory.findMany.mockResolvedValue(mockItems);

      const result = await service.getTop('user-1', 5);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [{ searchCount: 'desc' }, { lastSearchedAt: 'desc' }],
        take: 5,
      });
    });

    it('should use lastSearchedAt as tiebreaker for equal searchCount', async () => {
      mockPrismaService.searchHistory.findMany.mockResolvedValue([]);

      await service.getTop('user-1', 5);

      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ searchCount: 'desc' }, { lastSearchedAt: 'desc' }],
        }),
      );
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.searchHistory.findMany.mockResolvedValue([]);

      await service.getTop('user-1', 3);

      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 3,
        }),
      );
    });
  });

  describe('remove', () => {
    it('should remove a search history entry owned by the user', async () => {
      mockPrismaService.searchHistory.findUnique.mockResolvedValue({
        ...mockSearchHistory,
        userId: 'user-1',
      });
      mockPrismaService.searchHistory.delete.mockResolvedValue(mockSearchHistory);

      await service.remove('user-1', 'search-1');

      expect(mockPrismaService.searchHistory.findUnique).toHaveBeenCalledWith({
        where: { id: 'search-1' },
      });
      expect(mockPrismaService.searchHistory.delete).toHaveBeenCalledWith({
        where: { id: 'search-1' },
      });
    });

    it('should throw NotFoundException when entry does not exist', async () => {
      mockPrismaService.searchHistory.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.searchHistory.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when entry belongs to another user (IDOR prevention)', async () => {
      mockPrismaService.searchHistory.findUnique.mockResolvedValue({
        ...mockSearchHistory,
        userId: 'user-2',
      });

      await expect(service.remove('user-1', 'search-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.searchHistory.delete).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should delete all search history entries for the user', async () => {
      mockPrismaService.searchHistory.deleteMany.mockResolvedValue({ count: 5 });

      await service.clearAll('user-1');

      expect(mockPrismaService.searchHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should not throw error when user has no search history', async () => {
      mockPrismaService.searchHistory.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.clearAll('user-1')).resolves.not.toThrow();
    });

    it('should only delete entries belonging to the user', async () => {
      mockPrismaService.searchHistory.deleteMany.mockResolvedValue({ count: 3 });

      await service.clearAll('user-1');

      expect(mockPrismaService.searchHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('IDOR Prevention', () => {
    it('should only operate on user-owned resources in list', async () => {
      mockPrismaService.searchHistory.findMany.mockResolvedValue([]);
      mockPrismaService.searchHistory.count.mockResolvedValue(0);

      await service.list('user-1', 1, 20);

      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should only operate on user-owned resources in getRecent', async () => {
      mockPrismaService.searchHistory.findMany.mockResolvedValue([]);

      await service.getRecent('user-1', 5);

      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should only operate on user-owned resources in getTop', async () => {
      mockPrismaService.searchHistory.findMany.mockResolvedValue([]);

      await service.getTop('user-1', 5);

      expect(mockPrismaService.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should only operate on user-owned resources in clearAll', async () => {
      mockPrismaService.searchHistory.deleteMany.mockResolvedValue({ count: 0 });

      await service.clearAll('user-1');

      expect(mockPrismaService.searchHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('Transaction Safety', () => {
    it('should rollback on error during capture', async () => {
      const error = new Error('Database error');
      mockPrismaService.$transaction.mockRejectedValue(error);

      await expect(service.capture('user-1', 'test query')).rejects.toThrow(error);
    });

    it('should execute capture operations in a transaction', async () => {
      mockPrismaService.searchHistory.count.mockResolvedValue(0);
      mockPrismaService.searchHistory.upsert.mockResolvedValue(mockSearchHistory);

      await service.capture('user-1', 'test query');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
