import {
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';
import { AlertCondition, NotificationChannel } from '@prisma/client';
import { Type } from 'class-transformer';

// Only allow ACTIVE and PAUSED in updates (per Requirements 13.3, 13.4)
enum AllowedAlertStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
}

export class UpdateAlertDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999_999_999.99)
  threshold?: number;

  @IsOptional()
  @IsEnum(AlertCondition)
  condition?: AlertCondition;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsEnum(AllowedAlertStatus)
  status?: 'ACTIVE' | 'PAUSED';
}
