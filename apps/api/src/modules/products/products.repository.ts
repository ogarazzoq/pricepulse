import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        offers: {
          include: { marketplace: true },
          orderBy: { currentPrice: 'asc' },
        },
      },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
      include: {
        offers: {
          include: { marketplace: true },
          orderBy: { currentPrice: 'asc' },
        },
      },
    });
  }

  list(params: { skip?: number; take?: number; where?: Prisma.ProductWhereInput }) {
    return this.prisma.product.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: { updatedAt: 'desc' },
      include: {
        offers: { include: { marketplace: true }, orderBy: { currentPrice: 'asc' } },
      },
    });
  }

  count(where?: Prisma.ProductWhereInput) {
    return this.prisma.product.count({ where });
  }

  incrementViews(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }

  searchByTitle(query: string, limit = 20) {
    return this.prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: {
        offers: { include: { marketplace: true }, orderBy: { currentPrice: 'asc' }, take: 5 },
      },
    });
  }
}
