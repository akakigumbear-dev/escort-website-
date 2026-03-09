import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from 'database/entities/subscription.entity';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { User } from 'database/entities/user.entity';
import { SubscriptionStatus } from 'database/enums/enums';

const SUBSCRIPTION_DAYS = 30;
const DEFAULT_SUBSCRIPTION_PRICE = 29;

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(EscortProfile)
    private readonly profileRepo: Repository<EscortProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async subscribe(clientId: string, escortProfileId: string) {
    const user = await this.userRepo.findOne({
      where: { id: clientId },
    });
    if (!user) throw new NotFoundException('User not found');

    const profile = await this.profileRepo.findOne({
      where: { id: escortProfileId },
      relations: { user: true },
    });
    if (!profile) throw new NotFoundException('Escort profile not found');
    if (profile.user?.id === clientId) {
      throw new BadRequestException('Cannot subscribe to yourself');
    }

    // Check for ANY existing subscription row (unique index on clientId+escortProfileId)
    const existing = await this.subRepo.findOne({
      where: { clientId, escortProfileId },
    });

    if (existing) {
      // Already active and not expired — just return it
      if (
        existing.status === SubscriptionStatus.ACTIVE &&
        (!existing.endDate || new Date(existing.endDate) > new Date())
      ) {
        return this.toSubscriptionDto(existing, profile);
      }

      // Was cancelled/expired — reactivate it after charging
      const price = this.getPrice(profile);
      this.assertBalance(user, price);
      await this.deductBalance(clientId, price);

      const now = new Date();
      const endDate = new Date();
      endDate.setDate(now.getDate() + SUBSCRIPTION_DAYS);

      existing.status = SubscriptionStatus.ACTIVE;
      existing.startDate = now;
      existing.endDate = endDate;
      const saved = await this.subRepo.save(existing);

      const newBalance = await this.getBalance(clientId);
      return { ...this.toSubscriptionDto(saved, profile), price, newBalance };
    }

    // Brand new subscription
    const price = this.getPrice(profile);
    this.assertBalance(user, price);
    await this.deductBalance(clientId, price);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + SUBSCRIPTION_DAYS);

    const sub = this.subRepo.create({
      clientId,
      escortProfileId,
      status: SubscriptionStatus.ACTIVE,
      startDate,
      endDate,
    });
    const saved = await this.subRepo.save(sub);

    const newBalance = await this.getBalance(clientId);
    return { ...this.toSubscriptionDto(saved, profile), price, newBalance };
  }

  async getMySubscriptions(clientId: string) {
    const subs = await this.subRepo.find({
      where: { clientId, status: SubscriptionStatus.ACTIVE },
      relations: { escortProfile: true },
      order: { createdAt: 'DESC' },
    });
    const active = subs.filter(
      (s) => !s.endDate || new Date(s.endDate) > new Date(),
    );
    return active.map((s) => this.toSubscriptionDto(s, s.escortProfile));
  }

  async getMySubscribers(escortUserId: string) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: escortUserId } } as any,
    });
    if (!profile) return [];
    const subs = await this.subRepo.find({
      where: {
        escortProfileId: profile.id,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: { client: true },
      order: { createdAt: 'DESC' },
    });
    const active = subs.filter(
      (s) => !s.endDate || new Date(s.endDate) > new Date(),
    );
    return active.map((s) => ({
      id: s.id,
      clientId: s.clientId,
      clientEmail: s.client?.email,
      startDate: s.startDate,
      endDate: s.endDate,
    }));
  }

  async unsubscribe(clientId: string, escortProfileId: string) {
    const sub = await this.subRepo.findOne({
      where: { clientId, escortProfileId, status: SubscriptionStatus.ACTIVE },
    });
    if (!sub) throw new NotFoundException('No active subscription found');

    sub.status = SubscriptionStatus.CANCELLED;
    sub.endDate = new Date();
    await this.subRepo.save(sub);
    return { ok: true };
  }

  async isSubscribed(
    clientId: string | null,
    escortProfileId: string,
  ): Promise<boolean> {
    if (!clientId) return false;
    const sub = await this.subRepo.findOne({
      where: {
        clientId,
        escortProfileId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (!sub) return false;
    if (sub.endDate && new Date(sub.endDate) <= new Date()) return false;
    return true;
  }

  async checkSubscription(clientId: string, escortProfileId: string) {
    const ok = await this.isSubscribed(clientId, escortProfileId);
    return { subscribed: ok };
  }

  private getPrice(profile: EscortProfile): number {
    return profile.subscriptionPriceGel != null
      ? Number(profile.subscriptionPriceGel)
      : DEFAULT_SUBSCRIPTION_PRICE;
  }

  private assertBalance(user: User, price: number) {
    const balance = Number(user.balance ?? 0);
    if (balance < price) {
      throw new BadRequestException(
        `Insufficient balance. Subscription costs ${price}₾, you have ${balance.toFixed(2)}₾. Please deposit first.`,
      );
    }
  }

  private async deductBalance(userId: string, amount: number) {
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ balance: () => `balance - :amount` })
      .setParameter('amount', amount)
      .where('id = :id', { id: userId })
      .execute();
  }

  private async getBalance(userId: string): Promise<number> {
    const u = await this.userRepo.findOne({ where: { id: userId } });
    return Number(u?.balance ?? 0);
  }

  private toSubscriptionDto(sub: Subscription, profile: EscortProfile) {
    return {
      id: sub.id,
      escortProfileId: sub.escortProfileId,
      escortUsername: profile?.username ?? 'Unknown',
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      createdAt: sub.createdAt,
    };
  }
}
