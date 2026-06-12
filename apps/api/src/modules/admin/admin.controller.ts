import { Body, Controller, Get, Param, Patch, Post, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { MarketplacesService } from '../marketplaces/marketplaces.service';
import { JobsService } from '../jobs/jobs.service';

class CreateMarketplaceDto {
  @IsString() slug!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() websiteUrl?: string;
  @IsOptional() @IsString() baseCurrency?: string;
}

class PromoteUserDto {
  @IsString() userId!: string;
  @IsString() role!: 'USER' | 'ADMIN';
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly users: UsersService,
    private readonly marketplaces: MarketplacesService,
    private readonly jobs: JobsService,
  ) {}

  @Get('users')
  listUsers() {
    return this.users.list(1, 100);
  }

  @Patch('users/role')
  @ApiOperation({ summary: 'Promote or demote a user' })
  async setUserRole(@Body() dto: PromoteUserDto) {
    return this.users.setRole(dto.userId, dto.role as UserRole);
  }

  @Get('marketplaces')
  listMarketplaces() {
    return this.marketplaces.listAll();
  }

  @Post('marketplaces')
  @ApiOperation({ summary: 'Create a new marketplace' })
  createMarketplace(@Body() dto: CreateMarketplaceDto) {
    return this.marketplaces.create(dto);
  }

  @Patch('marketplaces/:id')
  toggleMarketplace(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.marketplaces.toggleActive(id, isActive);
  }

  @Delete('marketplaces/:id')
  @ApiOperation({ summary: 'Delete a marketplace' })
  deleteMarketplace(@Param('id') id: string) {
    return this.marketplaces.remove(id);
  }

  @Get('jobs')
  listJobs() {
    return this.jobs.snapshot();
  }

  @Get('jobs/logs')
  jobLogs() {
    return this.jobs.recentLogs();
  }

  @Post('jobs/price-sync/trigger')
  triggerPriceSync() {
    return this.jobs.triggerPriceSync();
  }

  @Post('jobs/alerts/trigger')
  triggerAlerts() {
    return this.jobs.triggerAlertEvaluation();
  }
}
