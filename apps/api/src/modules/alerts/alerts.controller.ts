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
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { BulkAlertsDto, BulkAlertOperationResultDto } from './dto/bulk-alerts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.alerts.listByUser(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAlertDto) {
    return this.alerts.create(user.sub, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.alerts.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.alerts.archive(user.sub, id);
  }

  @Post('bulk/pause')
  @ApiOperation({ summary: 'Bulk pause alerts' })
  @ApiResponse({
    status: 200,
    description: 'Returns bulk operation result',
    type: BulkAlertOperationResultDto,
  })
  bulkPause(@CurrentUser() user: JwtPayload, @Body() dto: BulkAlertsDto) {
    return this.alerts.bulkPause(user.sub, dto.alertIds);
  }

  @Post('bulk/resume')
  @ApiOperation({ summary: 'Bulk resume alerts' })
  @ApiResponse({
    status: 200,
    description: 'Returns bulk operation result',
    type: BulkAlertOperationResultDto,
  })
  bulkResume(@CurrentUser() user: JwtPayload, @Body() dto: BulkAlertsDto) {
    return this.alerts.bulkResume(user.sub, dto.alertIds);
  }

  @Post('bulk/archive')
  @ApiOperation({ summary: 'Bulk archive alerts' })
  @ApiResponse({
    status: 200,
    description: 'Returns bulk operation result',
    type: BulkAlertOperationResultDto,
  })
  bulkArchive(@CurrentUser() user: JwtPayload, @Body() dto: BulkAlertsDto) {
    return this.alerts.bulkArchive(user.sub, dto.alertIds);
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete alerts (hard delete)' })
  @ApiResponse({
    status: 200,
    description: 'Returns bulk operation result',
    type: BulkAlertOperationResultDto,
  })
  bulkDelete(@CurrentUser() user: JwtPayload, @Body() dto: BulkAlertsDto) {
    return this.alerts.bulkDelete(user.sub, dto.alertIds);
  }
}
