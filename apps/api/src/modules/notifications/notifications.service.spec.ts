import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MailerService } from '../../infra/mailer/mailer.service';
import { TelegramService } from '../../infra/telegram/telegram.service';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { NotificationMetadata } from './interfaces';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notification: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockMailerService = {
    send: jest.fn(),
  };

  const mockTelegramService = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: TelegramService,
          useValue: mockTelegramService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Clear environment variable
    delete process.env.ALERT_EMAIL_COOLDOWN_HOURS;
  });

  describe('isDuplicate', () => {
    const userId = 'user-123';
    const priceBucketHash = 'abc123def456';

    it('should return true when a duplicate notification exists within cooldown window', async () => {
      // Mock finding an existing notification
      mockPrismaService.notification.findFirst.mockResolvedValue({
        id: 'notification-1',
      });

      const result = await service.isDuplicate(userId, priceBucketHash);

      expect(result).toBe(true);
      expect(mockPrismaService.notification.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          createdAt: { gte: expect.any(Date) },
          metadata: {
            path: ['priceBucketHash'],
            equals: priceBucketHash,
          },
        },
        select: { id: true },
        timeout: 2000,
      });
    });

    it('should return false when no duplicate notification exists', async () => {
      // Mock no existing notification
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      const result = await service.isDuplicate(userId, priceBucketHash);

      expect(result).toBe(false);
    });

    it('should use default cooldown of 24 hours when env var not set', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      const now = Date.now();
      await service.isDuplicate(userId, priceBucketHash);

      const call = mockPrismaService.notification.findFirst.mock.calls[0][0];
      const cutoffTime = call.where.createdAt.gte.getTime();
      const expectedCutoff = now - 24 * 60 * 60 * 1000;

      // Allow 100ms tolerance for test execution time
      expect(cutoffTime).toBeGreaterThanOrEqual(expectedCutoff - 100);
      expect(cutoffTime).toBeLessThanOrEqual(expectedCutoff + 100);
    });

    it('should use custom cooldown hours when provided', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      const customCooldownHours = 12;
      const now = Date.now();
      
      await service.isDuplicate(userId, priceBucketHash, customCooldownHours);

      const call = mockPrismaService.notification.findFirst.mock.calls[0][0];
      const cutoffTime = call.where.createdAt.gte.getTime();
      const expectedCutoff = now - customCooldownHours * 60 * 60 * 1000;

      // Allow 100ms tolerance
      expect(cutoffTime).toBeGreaterThanOrEqual(expectedCutoff - 100);
      expect(cutoffTime).toBeLessThanOrEqual(expectedCutoff + 100);
    });

    it('should use cooldown from environment variable when set', async () => {
      process.env.ALERT_EMAIL_COOLDOWN_HOURS = '48';
      
      // Re-create service to pick up env variable
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: MailerService, useValue: mockMailerService },
          { provide: TelegramService, useValue: mockTelegramService },
        ],
      }).compile();
      
      const testService = module.get<NotificationsService>(NotificationsService);

      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      const now = Date.now();
      await testService.isDuplicate(userId, priceBucketHash);

      const call = mockPrismaService.notification.findFirst.mock.calls[0][0];
      const cutoffTime = call.where.createdAt.gte.getTime();
      const expectedCutoff = now - 48 * 60 * 60 * 1000;

      expect(cutoffTime).toBeGreaterThanOrEqual(expectedCutoff - 100);
      expect(cutoffTime).toBeLessThanOrEqual(expectedCutoff + 100);
    });

    it('should clamp cooldown hours to minimum 1 hour', async () => {
      process.env.ALERT_EMAIL_COOLDOWN_HOURS = '0';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: MailerService, useValue: mockMailerService },
          { provide: TelegramService, useValue: mockTelegramService },
        ],
      }).compile();

      const testService = module.get<NotificationsService>(NotificationsService);
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      const now = Date.now();
      await testService.isDuplicate(userId, priceBucketHash);

      const call = mockPrismaService.notification.findFirst.mock.calls[0][0];
      const cutoffTime = call.where.createdAt.gte.getTime();
      const expectedCutoff = now - 1 * 60 * 60 * 1000; // Minimum 1 hour

      expect(cutoffTime).toBeGreaterThanOrEqual(expectedCutoff - 100);
      expect(cutoffTime).toBeLessThanOrEqual(expectedCutoff + 100);
    });

    it('should clamp cooldown hours to maximum 168 hours (1 week)', async () => {
      process.env.ALERT_EMAIL_COOLDOWN_HOURS = '200';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: MailerService, useValue: mockMailerService },
          { provide: TelegramService, useValue: mockTelegramService },
        ],
      }).compile();

      const testService = module.get<NotificationsService>(NotificationsService);
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      const now = Date.now();
      await testService.isDuplicate(userId, priceBucketHash);

      const call = mockPrismaService.notification.findFirst.mock.calls[0][0];
      const cutoffTime = call.where.createdAt.gte.getTime();
      const expectedCutoff = now - 168 * 60 * 60 * 1000; // Maximum 168 hours

      expect(cutoffTime).toBeGreaterThanOrEqual(expectedCutoff - 100);
      expect(cutoffTime).toBeLessThanOrEqual(expectedCutoff + 100);
    });

    it('should use default 24 hours and log warning when env var is non-parseable', async () => {
      process.env.ALERT_EMAIL_COOLDOWN_HOURS = 'invalid';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: MailerService, useValue: mockMailerService },
          { provide: TelegramService, useValue: mockTelegramService },
        ],
      }).compile();

      const testService = module.get<NotificationsService>(NotificationsService);
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      const loggerWarnSpy = jest.spyOn((testService as any).logger, 'warn');

      const now = Date.now();
      await testService.isDuplicate(userId, priceBucketHash);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid ALERT_EMAIL_COOLDOWN_HOURS'),
      );

      const call = mockPrismaService.notification.findFirst.mock.calls[0][0];
      const cutoffTime = call.where.createdAt.gte.getTime();
      const expectedCutoff = now - 24 * 60 * 60 * 1000; // Default 24 hours

      expect(cutoffTime).toBeGreaterThanOrEqual(expectedCutoff - 100);
      expect(cutoffTime).toBeLessThanOrEqual(expectedCutoff + 100);
    });

    it('should throw error and log when database query fails', async () => {
      const dbError = new Error('Database connection timeout');
      mockPrismaService.notification.findFirst.mockRejectedValue(dbError);

      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      await expect(service.isDuplicate(userId, priceBucketHash)).rejects.toThrow(
        'Database connection timeout',
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dedup check failed'),
      );
    });

    it('should query with exact 2-second timeout', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await service.isDuplicate(userId, priceBucketHash);

      const call = mockPrismaService.notification.findFirst.mock.calls[0][0];
      expect(call.timeout).toBe(2000);
    });
  });

  describe('incrementRetry', () => {
    const notificationId = 'notification-123';

    it('should increment retry count when notification exists', async () => {
      const existingMetadata: NotificationMetadata = {
        offerId: 'offer-1',
        priceBucketHash: 'abc123',
        retryCount: 2,
      };

      mockPrismaService.notification.findUnique.mockResolvedValue({
        id: notificationId,
        metadata: existingMetadata,
      });

      mockPrismaService.notification.update.mockResolvedValue({});

      await service.incrementRetry(notificationId);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: {
          metadata: {
            ...existingMetadata,
            retryCount: 3,
          },
        },
      });
    });

    it('should initialize retry count to 1 when metadata is empty', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue({
        id: notificationId,
        metadata: {},
      });

      mockPrismaService.notification.update.mockResolvedValue({});

      await service.incrementRetry(notificationId);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: {
          metadata: {
            retryCount: 1,
          },
        },
      });
    });

    it('should initialize retry count to 1 when metadata is null', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue({
        id: notificationId,
        metadata: null,
      });

      mockPrismaService.notification.update.mockResolvedValue({});

      await service.incrementRetry(notificationId);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: {
          metadata: {
            retryCount: 1,
          },
        },
      });
    });

    it('should preserve other metadata fields when incrementing retry count', async () => {
      const existingMetadata: NotificationMetadata = {
        offerId: 'offer-1',
        marketplaceSlug: 'amazon',
        oldPrice: 100,
        newPrice: 85,
        priceBucketHash: 'abc123',
        retryCount: 0,
      };

      mockPrismaService.notification.findUnique.mockResolvedValue({
        id: notificationId,
        metadata: existingMetadata,
      });

      mockPrismaService.notification.update.mockResolvedValue({});

      await service.incrementRetry(notificationId);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: {
          metadata: {
            ...existingMetadata,
            retryCount: 1,
          },
        },
      });
    });

    it('should log warning and return when notification does not exist', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');

      await service.incrementRetry(notificationId);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot increment retry for missing notification'),
      );
      expect(mockPrismaService.notification.update).not.toHaveBeenCalled();
    });

    it('should handle multiple increments correctly', async () => {
      // First increment
      mockPrismaService.notification.findUnique.mockResolvedValueOnce({
        id: notificationId,
        metadata: { retryCount: 0 },
      });
      mockPrismaService.notification.update.mockResolvedValueOnce({});

      await service.incrementRetry(notificationId);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { metadata: { retryCount: 1 } },
      });

      // Second increment
      mockPrismaService.notification.findUnique.mockResolvedValueOnce({
        id: notificationId,
        metadata: { retryCount: 1 },
      });
      mockPrismaService.notification.update.mockResolvedValueOnce({});

      await service.incrementRetry(notificationId);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { metadata: { retryCount: 2 } },
      });
    });
  });

  describe('listForUser', () => {
    it('should return notifications for a user ordered by createdAt desc', async () => {
      const userId = 'user-123';
      const mockNotifications = [
        { id: '1', userId, createdAt: new Date('2024-01-02') },
        { id: '2', userId, createdAt: new Date('2024-01-01') },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.listForUser(userId);

      expect(result).toEqual(mockNotifications);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect custom limit parameter', async () => {
      const userId = 'user-123';
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.listForUser(userId, 10);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });
  });
});
