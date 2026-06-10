import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for SearchHistory response.
 * Represents a search history entry with metadata.
 */
export class SearchHistoryDto {
  @ApiProperty({
    description: 'Unique identifier for the search history entry',
    example: 'clh5j2k3l0000qzrmn1c2d3e4',
  })
  id!: string;

  @ApiProperty({
    description: 'User ID who performed the search',
    example: 'clh5j2k3l0000qzrmn1c2d3e4',
  })
  userId!: string;

  @ApiProperty({
    description: 'The original search query (preserves casing)',
    example: 'Wireless Headphones',
    maxLength: 256,
  })
  query!: string;

  @ApiProperty({
    description: 'The normalized search query (lowercase, trimmed, collapsed whitespace)',
    example: 'wireless headphones',
    maxLength: 256,
  })
  normalizedQuery!: string;

  @ApiProperty({
    description: 'Number of times this search has been performed by the user',
    example: 5,
    minimum: 1,
  })
  searchCount!: number;

  @ApiProperty({
    description: 'Timestamp of the most recent search',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastSearchedAt!: Date;

  @ApiProperty({
    description: 'Timestamp when this search entry was first created',
    example: '2024-01-10T08:15:00.000Z',
  })
  createdAt!: Date;
}
