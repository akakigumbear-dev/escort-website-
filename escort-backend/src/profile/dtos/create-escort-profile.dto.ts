import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { EscortService, Ethnicity, Gender, Language } from '../../../database/enums/enums';

export class CreateEscortProfileDto {
  @IsString()
  @MaxLength(50)
  username!: string;

  @IsString()
  @MaxLength(60)
  city!: string;

  @IsString()
  @MaxLength(200)
  address!: string;

  @IsArray()
  @IsEnum(EscortService, { each: true })
  services!: EscortService[];

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

  @IsEnum(Gender)
  gender!: Gender;

  @IsArray()
  @IsEnum(Language, { each: true })
  languages!: Language[];
}