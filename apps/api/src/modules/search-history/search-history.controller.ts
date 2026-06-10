import {
  Controller,
  UseGuards,
  Logger,
  Post,
  Body,
  Get,
  Query,
  Delete,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { SearchHistoryService } from './search-history.service';
import { CaptureSearchDto, SearchHistoryDto } from './dto';

/**
 * Controller for search history endpoints.
 * All endpoints require JWT authentication.
 */
@ApiTags('search-history')
@ApiBearerAuth()
@Controller('api/v1/searches')
@UseGuards(JwtAuthGuard)
export class SearchHistoryController {
  private readonly logger = new Logger(SearchHistoryController.name);

  constructor(private readonly searchHistoryService: SearchHistoryService) {}

  /**
   * Capture a search query for the authenticated user.
   * Creates a new entry or increments searchCount for existing query.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Capture a search query' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Search query captured successfully',
    type: SearchHistoryDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid query' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Not authenticated' })
  async capture(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CaptureSearchDto,
  ): Promise<SearchHistoryDto> {
    this.logger.debug(`Capturing search query for user ${user.sub}: ${dto.query}`);
    return await this.searchHistoryService.capture(user.sub, dto.query);
  }

  /**
   * List search history entries for the authenticated user with pagination.
   */
  @Get()
  @ApiOperation({ summary: 'List search history with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/SearchHistoryDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        pageSize: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Not authenticated' })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ): Promise<{ items: SearchHistoryDto[]; total: number; page: number; pageSize: number }> {
    this.logger.debug(`Listing search history for user ${user.sub}, page ${page}`);
    return await this.searchHistoryService.list(user.sub, page, pageSize);
  }

  /**
   * Get recent search queries for the authenticated user.
   */
  @Get('recent')
  @ApiOperation({ summary: 'Get recent search queries' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent searches (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent searches retrieved successfully',
    type: [SearchHistoryDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Not authenticated' })
  async getRecent(
    @CurrentUser() user: JwtPayload,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<SearchHistoryDto[]> {
    this.logger.debug(`Getting recent searches for user ${user.sub}, limit ${limit}`);
    return await this.searchHistoryService.getRecent(user.sub, limit);
  }

  /**
   * Get top (most frequently searched) queries for the authenticated user.
   */
  @Get('top')
  @ApiOperation({ summary: 'Get most frequently searched queries' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top searches (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Top searches retrieved successfully',
    type: [SearchHistoryDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Not authenticated' })
  async getTop(
    @CurrentUser() user: JwtPayload,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<SearchHistoryDto[]> {
    this.logger.debug(`Getting top searches for user ${user.sub}, limit ${limit}`);
    return await this.searchHistoryService.getTop(user.sub, limit);
  }

  /**
   * Remove a specific search history entry for the authenticated user.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a search history entry' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Entry removed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entry not found or not owned by user' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Not authenticated' })
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    this.logger.debug(`Removing search history entry ${id} for user ${user.sub}`);
    await this.searchHistoryService.remove(user.sub, id);
  }

  /**
   * Clear all search history entries for the authenticated user.
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear all search history' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'All entries cleared successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Not authenticated' })
  async clearAll(@CurrentUser() user: JwtPayload): Promise<void> {
    this.logger.debug(`Clearing all search history for user ${user.sub}`);
    await this.searchHistoryService.clearAll(user.sub);
  }
}
