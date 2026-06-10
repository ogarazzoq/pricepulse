import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SearchHistoryDto } from './dto';
import { normalizeQuery } from './search-history.utils';

/**
 * Service for managing user search history.
 * Implements capture, retrieval, and deletion operations with per-user capping.
 */
@Injectable()
export class SearchHistoryService {
  private readonly logger = new Logger(SearchHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Captures a search query for a user, implementing per-user cap enforcement.
   * - Creates a new entry or increments searchCount for existing entry
   * - Enforces per-user cap by evicting oldest entry when at limit
   * - Normalizes query for deduplication
   *
   * @param userId - The user ID
   * @param query - The search query to capture
   * @returns The captured/updated search history entry
   */
  async capture(userId: string, query: string): Promise<SearchHistoryDto> {
    const normalized = normalizeQuery(query);
    const cap = this.getCap();

    return await this.prisma.$transaction(async (tx) => {
      // Check current count for this user
      const count = await tx.searchHistory.count({
        where: { userId },
      });

      // If at cap, evict the oldest entry
      if (count >= cap) {
        const oldest = await tx.searchHistory.findFirst({
          where: { userId },
          orderBy: [{ lastSearchedAt: 'asc' }, { id: 'asc' }],
        });

        if (oldest) {
          await tx.searchHistory.delete({
            where: { id: oldest.id },
          });
        }
      }

      // Upsert the search entry
      const entry = await tx.searchHistory.upsert({
        where: {
          userId_normalizedQuery: {
            userId,
            normalizedQuery: normalized,
          },
        },
        create: {
          userId,
          query,
          normalizedQuery: normalized,
          searchCount: 1,
          lastSearchedAt: new Date(),
        },
        update: {
          query, // Update to latest casing
          searchCount: { increment: 1 },
          lastSearchedAt: new Date(),
        },
      });

      return this.serialize(entry);
    });
  }

  /**
   * Lists search history entries for a user with pagination.
   *
   * @param userId - The user ID
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of items per page
   * @returns Paginated search history response
   */
  async list(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: SearchHistoryDto[]; total: number; page: number; pageSize: number }> {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { lastSearchedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.searchHistory.count({
        where: { userId },
      }),
    ]);

    return {
      items: items.map((item) => this.serialize(item)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Retrieves the most recent searches for a user.
   *
   * @param userId - The user ID
   * @param limit - Number of recent searches to retrieve
   * @returns Array of recent search history entries
   */
  async getRecent(userId: string, limit: number): Promise<SearchHistoryDto[]> {
    const entries = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { lastSearchedAt: 'desc' },
      take: limit,
    });

    return entries.map((entry) => this.serialize(entry));
  }

  /**
   * Retrieves the most frequently searched queries for a user.
   *
   * @param userId - The user ID
   * @param limit - Number of top searches to retrieve
   * @returns Array of top search history entries ordered by searchCount desc, then lastSearchedAt desc
   */
  async getTop(userId: string, limit: number): Promise<SearchHistoryDto[]> {
    const entries = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: [{ searchCount: 'desc' }, { lastSearchedAt: 'desc' }],
      take: limit,
    });

    return entries.map((entry) => this.serialize(entry));
  }

  /**
   * Removes a specific search history entry for a user.
   * Returns 404 if the entry doesn't exist or doesn't belong to the user.
   *
   * @param userId - The user ID
   * @param id - The search history entry ID to remove
   * @throws NotFoundException if entry not found or not owned by user
   */
  async remove(userId: string, id: string): Promise<void> {
    const entry = await this.prisma.searchHistory.findUnique({
      where: { id },
    });

    // IDOR prevention: check if entry exists and belongs to user
    if (!entry || entry.userId !== userId) {
      throw new NotFoundException('Search history entry not found');
    }

    await this.prisma.searchHistory.delete({
      where: { id },
    });
  }

  /**
   * Clears all search history entries for a user.
   *
   * @param userId - The user ID
   */
  async clearAll(userId: string): Promise<void> {
    await this.prisma.searchHistory.deleteMany({
      where: { userId },
    });
  }

  /**
   * Gets the per-user cap from environment variable.
   * Defaults to 100 if not set, clamped to 10-1000.
   *
   * @returns The per-user cap value
   */
  private getCap(): number {
    const envValue = process.env.SEARCH_HISTORY_MAX_PER_USER;

    if (!envValue) {
      return 100;
    }

    const parsed = parseInt(envValue, 10);

    if (isNaN(parsed)) {
      this.logger.warn(
        `Invalid SEARCH_HISTORY_MAX_PER_USER: ${envValue}, using default 100`,
      );
      return 100;
    }

    // Clamp to 10-1000
    return Math.max(10, Math.min(1000, parsed));
  }

  /**
   * Serializes a Prisma SearchHistory entity to a DTO.
   */
  private serialize(entity: any): SearchHistoryDto {
    return {
      id: entity.id,
      userId: entity.userId,
      query: entity.query,
      normalizedQuery: entity.normalizedQuery,
      searchCount: entity.searchCount,
      lastSearchedAt: entity.lastSearchedAt,
      createdAt: entity.createdAt,
    };
  }
}
