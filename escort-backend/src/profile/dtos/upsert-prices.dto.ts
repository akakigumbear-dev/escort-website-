import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ServiceLocation } from 'database/enums/enums';
export class UpsertPricesDto {
  @IsEnum(ServiceLocation)
  serviceLocation!: ServiceLocation;

  @IsOptional()
  @IsInt()
  @Min(0)
  price30min?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  price1hour?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceWholeNight?: number | null;
}
