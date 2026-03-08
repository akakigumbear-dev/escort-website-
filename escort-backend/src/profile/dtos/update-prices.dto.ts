import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePricesDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
