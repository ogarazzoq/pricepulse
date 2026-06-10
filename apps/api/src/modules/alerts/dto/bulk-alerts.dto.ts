import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkAlertsDto {
  @ApiProperty({
    description: 'Array of alert IDs to process',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  alertIds!: string[];
}

export class BulkAlertOperationResultDto {
  @ApiProperty({ description: 'Number of alerts successfully processed' })
  success!: number;

  @ApiProperty({ description: 'Number of alerts that failed' })
  failed!: number;

  @ApiProperty({ description: 'Total number of alerts processed' })
  total!: number;

  @ApiProperty({
    description: 'Array of alert IDs that succeeded',
    type: [String],
  })
  successIds!: string[];

  @ApiProperty({
    description: 'Array of errors for failed items',
    type: [Object],
    example: [{ alertId: 'uuid-4', error: 'Alert not found' }],
  })
  errors!: Array<{ alertId: string; error: string }>;
}
