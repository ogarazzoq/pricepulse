import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for capturing a search query.
 * Validates that the query is a non-empty string with length between 2 and 256 characters.
 */
export class CaptureSearchDto {
  @ApiProperty({
    description: 'The search query to capture',
    minLength: 2,
    maxLength: 256,
    example: 'wireless headphones',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(256)
  query!: string;
}
