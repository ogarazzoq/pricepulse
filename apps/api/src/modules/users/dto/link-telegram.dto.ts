import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class GenerateTelegramCodeDto {
  // No fields needed - will use authenticated user
}

export class VerifyTelegramCodeDto {
  @ApiProperty({ 
    description: 'The 6-digit verification code from website',
    example: 'ABC123'
  })
  @IsString()
  @Length(6, 6)
  code!: string;
}
