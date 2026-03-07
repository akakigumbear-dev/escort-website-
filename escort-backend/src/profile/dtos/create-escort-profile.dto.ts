import { IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { EscortService, Ethnicity, Gender, Language } from '../../../database/enums/enums';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: '+995599123456' })
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Invalid phoneNumber format' })
  phoneNumber!: string;
  
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