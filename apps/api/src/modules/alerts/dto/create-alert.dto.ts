import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { AlertCondition, NotificationChannel } from '@prisma/client';

export class CreateAlertDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  marketplaceSlug?: string;

  @IsEnum(AlertCondition)
  condition!: AlertCondition;

  @IsNumber()
  @Min(0.01)
  threshold!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[];
}
