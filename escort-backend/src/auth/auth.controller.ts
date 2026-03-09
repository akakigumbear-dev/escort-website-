import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { DepositDto } from './dtos/deposit.dto';
import { ForgetPasswordDto } from './dtos/forget-password.dto';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/Register.dto';
import { JwtAuthGuard } from 'src/Guards/jwt.guard';

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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Get current user info including balance' })
  getMe(@Req() req: { user: { userId: string } }) {
    return this.auth.getMe(req.user.userId);
  }

  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Deposit funds to user balance' })
  deposit(
    @Req() req: { user: { userId: string } },
    @Body() dto: DepositDto,
  ) {
    return this.auth.deposit(req.user.userId, dto.amount);
  }

  /** Alias for POST /auth/deposit — use this if deposit returns 404 (e.g. proxy/cache). */
  @Post('balance')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Add to user balance (same as deposit)' })
  addBalance(
    @Req() req: { user: { userId: string } },
    @Body() dto: DepositDto,
  ) {
    return this.auth.deposit(req.user.userId, dto.amount);
  }

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
