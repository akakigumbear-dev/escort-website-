import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@mail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+995555123456' })
  @IsString()
  @Matches(/^\+?\d{9,15}$/, {
    message: 'Phone number must be 9-15 digits, optionally starting with +',
  })
  phoneNumber!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
