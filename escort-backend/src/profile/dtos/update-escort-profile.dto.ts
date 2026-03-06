import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { EscortService, Ethnicity, Gender, Language } from 'database/enums/enums';

export class UpdateEscortProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(EscortService, { each: true })
  services?: EscortService[];

  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsEnum(Ethnicity)
  ethnicity?: Ethnicity;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsArray()
  @IsEnum(Language, { each: true })
  languages?: Language[];
}