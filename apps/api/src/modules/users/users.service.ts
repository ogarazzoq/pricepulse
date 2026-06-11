import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...rest } = user;
    return rest;
  }

  list(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    return Promise.all([this.repo.list(skip, pageSize), this.repo.count()]).then(
      ([items, total]) => ({ items, total, page, pageSize }),
    );
  }

  updateProfile(id: string, dto: UpdateProfileDto) {
    return this.repo.updateProfile(id, dto);
  }

  // ========== Telegram Linking ==========

  async generateTelegramCode(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Check if already linked
    if (user.telegramChatId) {
      throw new ConflictException('Telegram account already linked');
    }

    // Generate 6-digit alphanumeric code
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing unused codes for this user
    await this.prisma.telegramVerification.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    });

    // Create new verification
    await this.prisma.telegramVerification.create({
      data: {
        userId,
        chatId: '', // Will be set when code is verified from bot
        code,
        expiresAt,
      },
    });

    return {
      code,
      expiresAt,
      expiresIn: 900, // seconds
    };
  }

  async verifyTelegramCode(chatId: string, code: string) {
    // Find verification
    const verification = await this.prisma.telegramVerification.findFirst({
      where: {
        code: code.toUpperCase(),
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Check if this telegram account is already linked to another user
    const existingUser = await this.prisma.user.findFirst({
      where: {
        telegramChatId: chatId,
        id: { not: verification.userId },
      },
    });

    if (existingUser) {
      throw new ConflictException('This Telegram account is already linked to another user');
    }

    // Update user with telegram chat ID
    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { telegramChatId: chatId },
    });

    // Mark verification as used
    await this.prisma.telegramVerification.update({
      where: { id: verification.id },
      data: {
        usedAt: new Date(),
        chatId,
      },
    });

    return {
      success: true,
      user: {
        id: verification.user.id,
        email: verification.user.email,
        name: verification.user.name,
      },
    };
  }

  async unlinkTelegram(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.telegramChatId) {
      throw new BadRequestException('Telegram account not linked');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null },
    });

    return { success: true };
  }

  async getTelegramLinkStatus(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    return {
      isLinked: !!user.telegramChatId,
      telegramChatId: user.telegramChatId,
    };
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
