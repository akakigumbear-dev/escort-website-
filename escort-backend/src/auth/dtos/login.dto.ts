import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@mail.com OR +995599123456' })
  @IsString()
  identifier!: string; // email ან phone

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}