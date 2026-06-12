import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MarketplaceRegistry } from './marketplace.registry';

@Injectable()
export class MarketplacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: MarketplaceRegistry,
  ) {}

  async listAll() {
    const records = await this.prisma.marketplace.findMany({
      orderBy: { name: 'asc' },
    });
    return records.map((m) => ({
      ...m,
      providerAvailable: this.registry.has(m.slug),
    }));
  }

  async getBySlug(slug: string) {
    const record = await this.prisma.marketplace.findUnique({ where: { slug } });
    if (!record) throw new NotFoundException(`Marketplace "${slug}" not found`);
    return record;
  }

  async toggleActive(id: string, isActive: boolean) {
    const updated = await this.prisma.marketplace.update({
      where: { id },
      data: { isActive },
    });
    this.registry.invalidateCache();
    return updated;
  }

  async create(dto: {
    slug: string;
    name: string;
    logoUrl?: string;
    websiteUrl?: string;
    baseCurrency?: string;
  }) {
    const existing = await this.prisma.marketplace.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Marketplace slug "${dto.slug}" already exists`);

    return this.prisma.marketplace.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        logoUrl: dto.logoUrl,
        websiteUrl: dto.websiteUrl,
        baseCurrency: dto.baseCurrency || 'USD',
        isActive: true,
      },
    });
  }

  async remove(id: string) {
    const marketplace = await this.prisma.marketplace.findUnique({ where: { id } });
    if (!marketplace) throw new NotFoundException('Marketplace not found');
    await this.prisma.marketplace.delete({ where: { id } });
    this.registry.invalidateCache();
    return { success: true };
  }
}
