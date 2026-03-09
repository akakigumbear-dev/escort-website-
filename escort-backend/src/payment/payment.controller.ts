import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../Guards/jwt.guard';
import { PaymentService } from './payment.service';
import { CreateInvoiceDto } from './dtos/create-invoice.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-invoice')
  async createInvoice(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.paymentService.createInvoice(req.user.userId, dto.amount);
  }

  /**
   * OxaPay webhook — no auth guard.
   * Uses rawBody for HMAC verification; must return 200 + "ok" for OxaPay to stop retrying.
   */
  @Post('webhook')
  async webhook(
    @Body() body: unknown,
    @Headers('hmac') hmac: string,
    @Req() req: { rawBody?: Buffer },
  ) {
    const raw =
      req.rawBody != null
        ? req.rawBody.toString('utf-8')
        : typeof body === 'string'
          ? body
          : JSON.stringify(body ?? {});
    await this.paymentService.handleWebhook(raw, hmac ?? '');
    return 'ok';
  }

  @Get('exchange-rate')
  async getExchangeRate() {
    return this.paymentService.getExchangeRate();
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:transactionId')
  async checkStatus(
    @Req() req: { user: { userId: string } },
    @Param('transactionId') transactionId: string,
  ) {
    return this.paymentService.checkStatus(transactionId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(@Req() req: { user: { userId: string } }) {
    return this.paymentService.getTransactions(req.user.userId);
  }
}
