import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PricesService } from './prices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Prices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prices')
export class PricesController {
  constructor(private readonly prices: PricesService) {}

  @Get(':productId/history')
  history(
    @Param('productId') productId: string,
    @Query('range') range: '7d' | '30d' | '90d' | '180d' | '365d' | 'all' = '30d',
  ) {
    return this.prices.getHistory(productId, range);
  }
}
