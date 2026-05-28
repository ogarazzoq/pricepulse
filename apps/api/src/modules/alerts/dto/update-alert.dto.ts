import { IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { AlertStatus } from '@prisma/client';

export class UpdateAlertDto {
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  threshold?: number;
}
