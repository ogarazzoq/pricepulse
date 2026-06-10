import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkUnsaveDto {
  @ApiProperty({
    description: 'Array of product IDs to unsave',
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
