import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum ProductSort {
  RELEVANCE = 'relevance',
  CHEAPEST = 'cheapest',
  EXPENSIVE = 'expensive',
  RATING = 'rating',
  NEWEST = 'newest',
}

export class SearchProductsDto {
  @IsString()
  @MinLength(2)
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 24;

  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort = ProductSort.RELEVANCE;

  @IsOptional()
  @IsString()
  marketplace?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;
}
