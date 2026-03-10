import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ForgetPasswordDto } from './dtos/forget-password.dto';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/Register.dto';
import { JwtAuthGuard } from 'src/Guards/jwt.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ description: 'Register user' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ description: 'Login user' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Get current user info including balance' })
  getMe(@Req() req: { user: { userId: string } }) {
    return this.auth.getMe(req.user.userId);
  }

  // Balance is now credited ONLY via OxaPay webhook (POST /payment/webhook).
  // Direct deposit endpoints have been removed for security.

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Change user password' })
  changePassword(
    @Req() req: { user: { userId: string } },
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.auth.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('forget-password')
  @ApiOkResponse({ description: 'Request password reset' })
  forgetPassword(@Body() dto: ForgetPasswordDto) {
    return this.auth.forgetPassword(dto);
  }
}
