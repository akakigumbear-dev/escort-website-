import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@mail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+995599123456' })
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Invalid phoneNumber format' })
  phoneNumber!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}