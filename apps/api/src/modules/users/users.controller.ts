import { Body, Controller, Get, Patch, Post, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.users.getById(user.sub);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.sub, dto);
  }

  // ========== Telegram Linking ==========

  @Post('me/telegram/generate-code')
  @ApiOperation({ 
    summary: 'Generate Telegram verification code',
    description: 'Creates a 6-digit code valid for 15 minutes to link Telegram account'
  })
  generateTelegramCode(@CurrentUser() user: JwtPayload) {
    return this.users.generateTelegramCode(user.sub);
  }

  @Get('me/telegram/status')
  @ApiOperation({ 
    summary: 'Get Telegram link status',
    description: 'Check if user has linked their Telegram account'
  })
  getTelegramStatus(@CurrentUser() user: JwtPayload) {
    return this.users.getTelegramLinkStatus(user.sub);
  }

  @Delete('me/telegram')
  @ApiOperation({ 
    summary: 'Unlink Telegram account',
    description: 'Remove Telegram account connection from user profile'
  })
  unlinkTelegram(@CurrentUser() user: JwtPayload) {
    return this.users.unlinkTelegram(user.sub);
  }
}
