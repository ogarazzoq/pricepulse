import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  list(skip = 0, take = 20) {
    return this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        telegramChatId: true,
        createdAt: true,
      },
    });
  }

  count() {
    return this.prisma.user.count();
  }

  updateProfile(id: string, data: { name?: string; avatarUrl?: string; telegramChatId?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
