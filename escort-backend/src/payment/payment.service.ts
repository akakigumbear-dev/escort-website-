import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac } from 'crypto';
import { Transaction, TransactionStatus } from 'database/entities/transaction.entity';
import { User } from 'database/entities/user.entity';

const OXAPAY_API = 'https://api.oxapay.com/v1/payment/invoice';
const NBG_RATE_API = 'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json/?currencies=USD';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly merchantKey: string;

  private cachedRate: { usdToGel: number; fetchedAt: number } | null = null;
  private static readonly RATE_TTL_MS = 30 * 60 * 1000; // 30 min cache

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    this.merchantKey = this.config.get<string>('OXAPAY_MERCHANT_KEY', '');
  }

  /** Fetch USD/GEL rate from National Bank of Georgia. Cached for 30 min. */
  private async getUsdToGelRate(): Promise<number> {
    if (this.cachedRate && Date.now() - this.cachedRate.fetchedAt < PaymentService.RATE_TTL_MS) {
      return this.cachedRate.usdToGel;
    }
    try {
      const res = await fetch(NBG_RATE_API);
      const json = await res.json();
      const raw = json?.[0]?.currencies?.[0]?.rate;
      const rate = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid NBG response');
      this.cachedRate = { usdToGel: rate, fetchedAt: Date.now() };
      this.logger.log(`NBG USD/GEL rate: ${rate}`);
      return rate;
    } catch (err) {
      this.logger.error(`Failed to fetch NBG rate: ${err}`);
      if (this.cachedRate) return this.cachedRate.usdToGel;
      return 2.75; // fallback
    }
  }

  /** Convert GEL to USD using current NBG rate. */
  private async gelToUsd(gel: number): Promise<number> {
    const rate = await this.getUsdToGelRate();
    return Math.round((gel / rate) * 100) / 100; // round to 2 decimals
  }

  /** Get current exchange rate (exposed to frontend). */
  async getExchangeRate() {
    const rate = await this.getUsdToGelRate();
    return { usdToGel: rate };
  }

  /**
   * Create an OxaPay invoice.
   * User sends amount in GEL → we convert to USD for OxaPay → on payment we credit GEL.
   */
  async createInvoice(userId: string, amountGel: number) {
    if (amountGel <= 0) throw new BadRequestException('Amount must be positive');
    if (!this.merchantKey || this.merchantKey === 'your-oxapay-merchant-api-key') {
      throw new BadRequestException('OxaPay merchant key not configured');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const amountUsd = await this.gelToUsd(amountGel);
    if (amountUsd < 1) throw new BadRequestException('Amount too small (minimum ~1 USD)');

    const orderId = `dep-${userId.slice(0, 8)}-${Date.now()}`;
    const payload = {
      amount: amountUsd,
      currency: 'USD',
      lifetime: 60,
      callback_url: this.getCallbackUrl(),
      return_url: this.config.get<string>('VITE_API_BASE_URL', 'http://localhost:3000').replace('/api', ''),
      order_id: orderId,
      description: `Deposit ${amountGel} ₾ to ELITEFUN balance`,
    };

    this.logger.log(`Creating OxaPay invoice: ${amountGel} GEL = ${amountUsd} USD | ${JSON.stringify(payload)}`);

    const res = await fetch(OXAPAY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant_api_key': this.merchantKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    this.logger.log(`OxaPay response: ${JSON.stringify(data)}`);

    if (data.status !== 200) {
      this.logger.error(`OxaPay invoice failed: ${JSON.stringify(data)}`);
      throw new BadRequestException(data.error?.message || data.message || 'Payment gateway error');
    }

    const trackId = data.data?.track_id ?? data.data?.trackId;
    const paymentUrl = data.data?.payment_url ?? data.data?.paymentUrl;

    if (!trackId || typeof trackId !== 'string') {
      this.logger.error(`OxaPay missing trackId: ${JSON.stringify(data)}`);
      throw new BadRequestException('Payment gateway did not return payment link');
    }

    const tx = this.txRepo.create({
      user,
      userId,
      amount: amountGel,
      trackId,
      orderId,
      status: TransactionStatus.PENDING,
      paymentUrl,
    });
    const saved = await this.txRepo.save(tx);

    return {
      transactionId: saved.id,
      trackId,
      paymentUrl,
      amountGel,
      amountUsd,
    };
  }

  /**
   * Handle OxaPay webhook callback.
   * Verifies HMAC, updates transaction status, credits user balance on "paid".
   */
  async handleWebhook(rawBody: string, hmacHeader: string) {
    if (!this.verifyHmac(rawBody, hmacHeader)) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      this.logger.error('Webhook: invalid JSON');
      throw new BadRequestException('Invalid JSON');
    }

    const trackId = (payload.track_id ?? payload.trackId) as string | undefined;
    const status = typeof payload.status === 'string' ? payload.status.toLowerCase() : '';
    const currency = (payload.currency as string) ?? null;
    const amount = payload.amount != null ? Number(payload.amount) : null;

    this.logger.log(`Webhook received: trackId=${trackId} status=${status}`);

    if (!trackId) {
      this.logger.warn('Webhook: missing trackId');
      return;
    }

    const tx = await this.txRepo.findOne({ where: { trackId } });
    if (!tx) {
      this.logger.warn(`Transaction not found for trackId=${trackId}`);
      return { ok: true };
    }

    if (tx.status === TransactionStatus.PAID) {
      return { ok: true };
    }

    if (status === 'paying') {
      tx.status = TransactionStatus.PAYING;
      tx.cryptoCurrency = currency ?? null;
      tx.cryptoAmount = amount ? Number(amount) : null;
      await this.txRepo.save(tx);
      return { ok: true };
    }

    if (status === 'paid') {
      tx.status = TransactionStatus.PAID;
      tx.cryptoCurrency = currency ?? tx.cryptoCurrency;
      tx.cryptoAmount = amount ? Number(amount) : tx.cryptoAmount;
      await this.txRepo.save(tx);

      await this.creditBalance(tx.userId, Number(tx.amount));

      this.logger.log(`Credited ${tx.amount} ₾ to user ${tx.userId}`);
      return { ok: true };
    }

    if (status === 'expired' || status === 'failed') {
      tx.status = status === 'expired' ? TransactionStatus.EXPIRED : TransactionStatus.FAILED;
      await this.txRepo.save(tx);
    }

    return { ok: true };
  }

  /** Check invoice status from OxaPay (for frontend polling). */
  async checkStatus(transactionId: string, userId: string) {
    const tx = await this.txRepo.findOne({ where: { id: transactionId, userId } });
    if (!tx) throw new BadRequestException('Transaction not found');
    return {
      transactionId: tx.id,
      status: tx.status,
      amount: tx.amount,
      paymentUrl: tx.paymentUrl,
    };
  }

  /** Get user's transaction history. */
  async getTransactions(userId: string) {
    return this.txRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  private async creditBalance(userId: string, amount: number) {
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ balance: () => 'balance + :amount' })
      .setParameter('amount', amount)
      .where('id = :id', { id: userId })
      .execute();
  }

  private verifyHmac(rawBody: string, hmacHeader: string): boolean {
    if (!hmacHeader) return false;
    const computed = createHmac('sha512', this.merchantKey)
      .update(rawBody)
      .digest('hex');
    return computed === hmacHeader;
  }

  private getCallbackUrl(): string {
    const apiUrl = this.config.get<string>('VITE_API_BASE_URL', 'http://localhost:3000');
    return `${apiUrl}/payment/webhook`;
  }
}
