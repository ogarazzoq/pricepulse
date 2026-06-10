import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddProductsToCollectionDto, MoveProductsDto } from './dto/add-products.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Collections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all collections for current user' })
  @ApiResponse({ status: 200, description: 'Returns list of collections' })
  list(@CurrentUser() user: JwtPayload) {
    return this.collectionsService.list(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get collection with products' })
  @ApiResponse({ status: 200, description: 'Returns collection details' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.collectionsService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new collection' })
  @ApiResponse({ status: 201, description: 'Collection created' })
  @ApiResponse({ status: 409, description: 'Collection name already exists' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a collection' })
  @ApiResponse({ status: 200, description: 'Collection updated' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  @ApiResponse({ status: 409, description: 'Collection name already exists' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a collection' })
  @ApiResponse({ status: 204, description: 'Collection deleted' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.collectionsService.delete(user.sub, id);
  }

  @Post(':id/products')
  @ApiOperation({ summary: 'Add products to collection' })
  @ApiResponse({ status: 200, description: 'Products added to collection' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  addProducts(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddProductsToCollectionDto,
  ) {
    return this.collectionsService.addProducts(user.sub, id, dto.productIds);
  }

  @Delete(':id/products/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove product from collection' })
  @ApiResponse({ status: 204, description: 'Product removed from collection' })
  removeProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.collectionsService.removeProduct(user.sub, id, productId);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move products between collections' })
  @ApiResponse({ status: 200, description: 'Products moved successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  moveProducts(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: MoveProductsDto,
  ) {
    return this.collectionsService.moveProducts(
      user.sub,
      id,
      dto.targetCollectionId,
      dto.productIds,
    );
  }
}
