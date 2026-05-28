import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { MarketplacesService } from '../marketplaces/marketplaces.service';
import { JobsService } from '../jobs/jobs.service';

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

  @Get('marketplaces')
  listMarketplaces() {
    return this.marketplaces.listAll();
  }

  @Patch('marketplaces/:id')
  toggleMarketplace(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.marketplaces.toggleActive(id, isActive);
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
