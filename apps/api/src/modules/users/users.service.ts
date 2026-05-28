import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

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
}
