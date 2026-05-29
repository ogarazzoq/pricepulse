import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UpcItemDbEnricher } from './providers/upcitemdb.enricher';
import { EnrichmentProvider } from './providers/enrichment-provider.interface';

/**
 * Runs all configured enrichment providers against a product, in best-effort
 * mode, and merges resolved metadata into the existing record without
 * overwriting any non-null fields.
 *
 * The service is fire-and-forget: callers should NOT await it on the request
 * path; instead they invoke `enrichProduct(id).catch(…)` so search latency
 * stays bounded.
 */
@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);
  private readonly enrichers: EnrichmentProvider[];

  constructor(
    private readonly prisma: PrismaService,
    upcItemDb: UpcItemDbEnricher,
  ) {
    this.enrichers = [upcItemDb].filter((e) => e.enabled);
    this.logger.log(`Active enrichers: ${this.enrichers.map((e) => e.slug).join(', ') || 'none'}`);
  }

  async enrichProduct(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return;

    for (const enricher of this.enrichers) {
      try {
        const result = await enricher.enrich({
          productId: product.id,
          title: product.title,
          brand: product.brand,
          barcode: product.barcode,
          mpn: product.mpn,
        });
        if (!result) continue;

        const patch: Record<string, unknown> = {};
        if (!product.brand && result.brand) patch.brand = result.brand;
        if (!product.category && result.category) patch.category = result.category;
        if (!product.barcode && result.barcode) patch.barcode = result.barcode;
        if (!product.mpn && result.mpn) patch.mpn = result.mpn;
        if (!product.imageUrl && result.imageUrl) patch.imageUrl = result.imageUrl;
        if (!product.description && result.description) patch.description = result.description;

        if (Object.keys(patch).length > 0) {
          await this.prisma.product.update({ where: { id: productId }, data: patch });
          this.logger.debug(
            `Enriched ${product.title} via ${enricher.slug}: ${Object.keys(patch).join(', ')}`,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Enricher ${enricher.slug} failed: ${err?.message}`);
      }
    }
  }
}
