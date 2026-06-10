import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SavedProductsService } from './saved-products.service';
import { CreateSavedProductDto } from './dto/create-saved-product.dto';
import { BulkSaveDto, BulkOperationResultDto } from './dto/bulk-save.dto';
import { BulkUnsaveDto } from './dto/bulk-unsave.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Saved Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('saved')
export class SavedProductsController {
  constructor(private readonly savedProductsService: SavedProductsService) {}

  /**
   * GET /api/v1/saved - List user's saved products with pagination
   * Returns paginated list ordered by createdAt descending
   * Default: page=1, pageSize=20; pageSize clamped to 100
   * Query params: ?collection=uuid to filter by collection
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.12
   */
  @Get()
  @ApiOperation({ summary: 'List saved products' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of saved products with joined product data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() paginationDto: PaginationDto,
    @Query('collection') collectionId?: string,
  ) {
    const { page = 1, pageSize = 20 } = paginationDto;
    return this.savedProductsService.list(user.sub, page, pageSize, collectionId);
  }

  /**
   * POST /api/v1/saved - Save a product (idempotent)
   * Returns HTTP 201 for new save, HTTP 200 for existing
   * Requirements: 2.5
   */
  @Post()
  @ApiOperation({ summary: 'Save a product' })
  @ApiResponse({
    status: 201,
    description: 'Product saved successfully (new)',
  })
  @ApiResponse({
    status: 200,
    description: 'Product already saved (existing)',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid productId' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createDto: CreateSavedProductDto,
    @Res() res: Response,
  ) {
    const result = await this.savedProductsService.create(
      user.sub,
      createDto.productId,
    );

    // Return HTTP 201 for new saves, HTTP 200 for existing
    const statusCode = result.isNew ? HttpStatus.CREATED : HttpStatus.OK;
    return res.status(statusCode).json(result.data);
  }

  /**
   * DELETE /api/v1/saved/:productId - Unsave a product
   * Returns HTTP 204 (no-op if not saved)
   * Requirements: 2.6, 2.7
   */
  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsave a product' })
  @ApiResponse({
    status: 204,
    description: 'Product unsaved successfully (or was not saved)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
  ): Promise<void> {
    await this.savedProductsService.remove(user.sub, productId);
  }

  /**
   * GET /api/v1/saved/count - Get total saved products count
   * Returns { count: number }
   * Requirements: 2.8
   */
  @Get('count')
  @ApiOperation({ summary: 'Get saved products count' })
  @ApiResponse({
    status: 200,
    description: 'Returns total count of saved products',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
  async count(@CurrentUser() user: JwtPayload) {
    const count = await this.savedProductsService.count(user.sub);
    return { count };
  }

  /**
   * GET /api/v1/saved/check/:productId - Check if product is saved
   * Returns { saved: boolean }
   * Requirements: 2.9
   */
  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is saved' })
  @ApiResponse({
    status: 200,
    description: 'Returns saved status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
  async check(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
  ) {
    const saved = await this.savedProductsService.check(user.sub, productId);
    return { saved };
  }

  /**
   * POST /api/v1/saved/bulk/save - Bulk save multiple products
   * Processes up to 50 products at once
   * Returns success/failure report
   */
  @Post('bulk/save')
  @ApiOperation({ summary: 'Bulk save products' })
  @ApiResponse({
    status: 200,
    description: 'Returns bulk operation result with success/failure counts',
    type: BulkOperationResultDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid productIds array' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
  async bulkSave(
    @CurrentUser() user: JwtPayload,
    @Body() bulkSaveDto: BulkSaveDto,
  ): Promise<BulkOperationResultDto> {
    return this.savedProductsService.bulkSave(user.sub, bulkSaveDto.productIds);
  }

  /**
   * POST /api/v1/saved/bulk/unsave - Bulk unsave multiple products
   * Processes up to 50 products at once (idempotent)
   * Returns success/failure report
   */
  @Post('bulk/unsave')
  @ApiOperation({ summary: 'Bulk unsave products' })
  @ApiResponse({
    status: 200,
    description: 'Returns bulk operation result with success/failure counts',
    type: BulkOperationResultDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid productIds array' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
  async bulkUnsave(
    @CurrentUser() user: JwtPayload,
    @Body() bulkUnsaveDto: BulkUnsaveDto,
  ): Promise<BulkOperationResultDto> {
    return this.savedProductsService.bulkUnsave(user.sub, bulkUnsaveDto.productIds);
  }
}
