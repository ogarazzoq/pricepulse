import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class AddProductsToCollectionDto {
  @ApiProperty({
    description: 'Array of product IDs to add to collection',
    example: ['uuid-1', 'uuid-2'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  productIds!: string[];
}

export class RemoveProductFromCollectionDto {
  @ApiProperty({
    description: 'Product ID to remove from collection',
    example: 'uuid-1',
  })
  @IsString()
  productId!: string;
}

export class MoveProductsDto {
  @ApiProperty({
    description: 'Array of product IDs to move',
    example: ['uuid-1', 'uuid-2'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  productIds!: string[];

  @ApiProperty({
    description: 'Target collection ID (null to remove from collection)',
    example: 'collection-uuid',
    required: false,
  })
  @IsString()
  targetCollectionId!: string;
}
