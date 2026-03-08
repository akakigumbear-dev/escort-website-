import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { JwtAuthGuard } from 'src/Guards/jwt.guard';
import { SubscriptionService } from './subscription.service';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  subscribe(
    @Req() req: { user: { userId: string } },
    @Body() body: { escortProfileId: string },
  ) {
    if (!body?.escortProfileId) {
      throw new BadRequestException('escortProfileId is required');
    }
    return this.subscriptionService.subscribe(
      req.user.userId,
      body.escortProfileId,
    );
  }

  @Get('me')
  getMySubscriptions(@Req() req: { user: { userId: string } }) {
    return this.subscriptionService.getMySubscriptions(req.user.userId);
  }

  @Get('subscribers')
  getMySubscribers(@Req() req: { user: { userId: string } }) {
    return this.subscriptionService.getMySubscribers(req.user.userId);
  }

  @Get('check/:escortProfileId')
  check(
    @Req() req: { user: { userId: string } },
    @Param('escortProfileId', ParseUUIDPipe) escortProfileId: string,
  ) {
    return this.subscriptionService.checkSubscription(
      req.user.userId,
      escortProfileId,
    );
  }
}
