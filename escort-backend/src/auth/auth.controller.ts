import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ForgetPasswordDto } from './dtos/forget-password.dto';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/Register.dto';



@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOkResponse({ description: 'Register user' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @ApiOkResponse({ description: 'Login user' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('forget-password')
  @ApiOkResponse({ description: 'Request password reset' })
  forgetPassword(@Body() dto: ForgetPasswordDto) {
    return this.auth.forgetPassword(dto);
  }
}