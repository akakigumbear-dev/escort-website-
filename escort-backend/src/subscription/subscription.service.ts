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
import { UserRole, SubscriptionStatus } from 'database/enums/enums';

const SUBSCRIPTION_DAYS = 30;

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
      relations: { escort_profile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.CLIENT) {
      throw new BadRequestException('Only clients can subscribe to escorts');
    }

    const profile = await this.profileRepo.findOne({
      where: { id: escortProfileId },
      relations: { user: true },
    });
    if (!profile) throw new NotFoundException('Escort profile not found');
    if (profile.user?.id === clientId) {
      throw new BadRequestException('Cannot subscribe to yourself');
    }

    const existing = await this.subRepo.findOne({
      where: { clientId, escortProfileId, status: SubscriptionStatus.ACTIVE },
    });
    if (existing) {
      return this.toSubscriptionDto(existing, profile);
    }

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
    return this.toSubscriptionDto(saved, profile);
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
      where: { escortProfileId: profile.id, status: SubscriptionStatus.ACTIVE },
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

  private toSubscriptionDto(sub: Subscription, profile: EscortProfile) {
    return {
      id: sub.id,
      escortProfileId: sub.escortProfileId,
      escortUsername: profile.username,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      createdAt: sub.createdAt,
    };
  }
}
