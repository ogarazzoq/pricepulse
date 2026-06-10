import { Controller, UseGuards, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SearchHistoryService } from './search-history.service';

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
   * Placeholder endpoints.
   * Will be implemented in task 3.5.
   */
}
