import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { SearchProductsDto } from './dto/search-products.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('search')
  search(@Query() dto: SearchProductsDto) {
    return this.products.search(dto.q, dto.limit, {
      sort: dto.sort,
      marketplace: dto.marketplace,
      inStock: dto.inStock,
      minPrice: dto.minPrice,
      maxPrice: dto.maxPrice,
    });
  }

  @Get()
  list(@Query() dto: ListProductsDto) {
    return this.products.listCatalog(dto.page, dto.pageSize, dto.q, {
      sort: dto.sort,
      marketplace: dto.marketplace,
      inStock: dto.inStock,
    });
  }

  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.products.getBySlug(slug);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.products.getById(id);
  }
}
