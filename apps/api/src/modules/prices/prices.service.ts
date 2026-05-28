import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

type Range = '7d' | '30d' | '90d' | '180d' | '365d' | 'all';

@Injectable()
export class PricesService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistory(productId: string, range: Range = '30d') {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { offers: { include: { marketplace: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');

    const since = this.rangeToDate(range);

    const series = await Promise.all(
      product.offers.map(async (offer) => {
        const snapshots = await this.prisma.priceSnapshot.findMany({
          where: {
            productOfferId: offer.id,
            ...(since && { recordedAt: { gte: since } }),
          },
          orderBy: { recordedAt: 'asc' },
          select: { price: true, recordedAt: true },
        });
        return {
          marketplaceSlug: offer.marketplace.slug,
          marketplaceName: offer.marketplace.name,
          points: snapshots.map((s) => ({
            date: s.recordedAt.toISOString(),
            price: Number(s.price),
          })),
        };
      }),
    );

    const allPrices = series.flatMap((s) => s.points.map((p) => p.price));
    const current =
      product.offers.length > 0 ? Number(product.offers[0].currentPrice) : 0;

    const lowest = allPrices.length ? Math.min(...allPrices) : current;
    const highest = allPrices.length ? Math.max(...allPrices) : current;
    const average = allPrices.length
      ? Number((allPrices.reduce((a, b) => a + b, 0) / allPrices.length).toFixed(2))
      : current;

    // 30-day change
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const oldest = series
      .flatMap((s) => s.points)
      .filter((p) => new Date(p.date) >= thirtyDaysAgo)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
    const change30d = oldest ? Number((current - oldest.price).toFixed(2)) : 0;
    const changePercent30d =
      oldest && oldest.price > 0
        ? Number(((change30d / oldest.price) * 100).toFixed(2))
        : 0;

    // Rolling volatility (std-dev / mean)
    const mean = average || 0;
    const variance =
      allPrices.length > 0
        ? allPrices.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / allPrices.length
        : 0;
    const stddev = Math.sqrt(variance);
    const volatility = mean > 0 ? Number(((stddev / mean) * 100).toFixed(2)) : 0;

    return {
      productId,
      range,
      series,
      stats: {
        current,
        lowest,
        highest,
        average,
        change30d,
        changePercent30d,
        volatility,
      },
    };
  }

  private rangeToDate(range: Range): Date | null {
    if (range === 'all') return null;
    const days = parseInt(range.replace('d', ''), 10);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }
}
