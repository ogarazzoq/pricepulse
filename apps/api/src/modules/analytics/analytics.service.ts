import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Single endpoint that powers the dashboard overview.
   */
  async overview(userId?: string) {
    const [
      trackedProducts,
      activeAlerts,
      triggeredAlerts30d,
      topDiscounts,
      recentSnapshots,
      cheapestMarketplaces,
      trending,
      savedProductsCount,
      searchHistoryCount,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.alert.count({
        where: { status: 'ACTIVE', ...(userId ? { userId } : {}) },
      }),
      this.prisma.alert.count({
        where: {
          status: 'TRIGGERED',
          ...(userId ? { userId } : {}),
          lastTriggeredAt: { gte: this.daysAgo(30) },
        },
      }),
      this.prisma.productOffer.findMany({
        where: { discountPercent: { not: null, gt: 0 } },
        orderBy: { discountPercent: 'desc' },
        take: 6,
        include: { product: true, marketplace: true },
      }),
      this.prisma.priceSnapshot.findMany({
        where: { recordedAt: { gte: this.daysAgo(7) } },
        orderBy: { recordedAt: 'desc' },
        take: 200,
        include: {
          productOffer: { include: { product: true, marketplace: true } },
        },
      }),
      this.prisma.$queryRaw<
        { marketplaceslug: string; marketplacename: string; avg: number; cnt: number }[]
      >(Prisma.sql`
        SELECT m."slug" AS marketplaceslug,
               m."name" AS marketplacename,
               AVG(po."currentPrice")::float AS avg,
               COUNT(po.id)::int AS cnt
        FROM "ProductOffer" po
        JOIN "Marketplace" m ON m.id = po."marketplaceId"
        GROUP BY m."slug", m."name"
        ORDER BY avg ASC
        LIMIT 6
      `),
      this.prisma.product.findMany({
        orderBy: [{ views: 'desc' }, { updatedAt: 'desc' }],
        take: 6,
        include: { offers: { orderBy: { currentPrice: 'asc' }, take: 1 } },
      }),
      // NEW: Saved products count (user-specific if userId provided)
      userId
        ? this.prisma.savedProduct.count({ where: { userId } })
        : this.prisma.savedProduct.count(),
      // NEW: Search history count (user-specific if userId provided)
      userId
        ? this.prisma.searchHistory.count({ where: { userId } })
        : this.prisma.searchHistory.count(),
    ]);

    const recentDrops = this.computeRecentDrops(recentSnapshots);

    const avgSavings =
      topDiscounts.length > 0
        ? topDiscounts.reduce(
            (acc, o) => acc + Number(o.discountPercent ?? 0),
            0,
          ) / topDiscounts.length
        : 0;

    return {
      totals: {
        trackedProducts,
        activeAlerts,
        triggeredAlerts30d,
        averageSavingsPercent: Number(avgSavings.toFixed(2)),
        savedProducts: savedProductsCount,
        searchQueries: searchHistoryCount,
      },
      topDiscounts: topDiscounts.map((o) => ({
        productId: o.productId,
        title: o.product.title,
        imageUrl: o.product.imageUrl,
        marketplaceSlug: o.marketplace.slug,
        currentPrice: Number(o.currentPrice),
        originalPrice: Number(o.originalPrice ?? o.currentPrice),
        discountPercent: Number(o.discountPercent ?? 0),
      })),
      recentDrops,
      cheapestMarketplaces: cheapestMarketplaces.map((row) => ({
        marketplaceSlug: row.marketplaceslug,
        marketplaceName: row.marketplacename,
        averagePrice: Number(Number(row.avg).toFixed(2)),
        productCount: Number(row.cnt),
      })),
      trending: trending.map((p) => ({
        productId: p.id,
        title: p.title,
        imageUrl: p.imageUrl,
        views: p.views,
        priceChangePercent: 0,
      })),
    };
  }

  private computeRecentDrops(
    snapshots: Array<any>,
  ): Array<{
    productId: string;
    title: string;
    imageUrl?: string | null;
    marketplaceSlug: string;
    previousPrice: number;
    currentPrice: number;
    droppedAt: string;
  }> {
    // Group snapshots per offer, look for transitions where price decreased.
    const groups = new Map<string, any[]>();
    for (const s of snapshots) {
      const key = s.productOffer.id;
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    const drops: any[] = [];
    for (const list of groups.values()) {
      const sorted = [...list].sort((a, b) => +a.recordedAt - +b.recordedAt);
      for (let i = 1; i < sorted.length; i++) {
        const prev = Number(sorted[i - 1].price);
        const curr = Number(sorted[i].price);
        if (curr < prev) {
          const last = sorted[i];
          drops.push({
            productId: last.productOffer.product.id,
            title: last.productOffer.product.title,
            imageUrl: last.productOffer.product.imageUrl,
            marketplaceSlug: last.productOffer.marketplace.slug,
            previousPrice: prev,
            currentPrice: curr,
            droppedAt: last.recordedAt.toISOString(),
          });
        }
      }
    }
    return drops
      .sort((a, b) => +new Date(b.droppedAt) - +new Date(a.droppedAt))
      .slice(0, 8);
  }

  private daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }
}
