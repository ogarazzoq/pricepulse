import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MarketplacesService } from './marketplaces.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Marketplaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketplaces')
export class MarketplacesController {
  constructor(private readonly marketplaces: MarketplacesService) {}

  @Get()
  list() {
    return this.marketplaces.listAll();
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.marketplaces.getBySlug(slug);
  }
}
