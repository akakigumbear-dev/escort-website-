import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ForgetPasswordDto {
  @ApiProperty({ example: 'user@mail.com OR +995599123456' })
  @IsString()
  identifier!: string;
}