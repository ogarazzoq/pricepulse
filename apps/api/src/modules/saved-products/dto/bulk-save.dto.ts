import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkSaveDto {
  @ApiProperty({
    description: 'Array of product IDs to save',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  productIds!: string[];
}

export class BulkOperationResultDto {
  @ApiProperty({ description: 'Number of items successfully processed' })
  success!: number;

  @ApiProperty({ description: 'Number of items that failed' })
  failed!: number;

  @ApiProperty({ description: 'Total number of items processed' })
  total!: number;

  @ApiProperty({
    description: 'Array of product IDs that succeeded',
    type: [String],
  })
  successIds!: string[];

  @ApiProperty({
    description: 'Array of errors for failed items',
    type: [Object],
    example: [{ productId: 'uuid-4', error: 'Product not found' }],
  })
  errors!: Array<{ productId: string; error: string }>;
}
