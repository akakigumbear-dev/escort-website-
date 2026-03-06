import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { EscortPrices } from 'database/entities/escort-price.entity';
import { GetAllEscortsDto } from './dtos/get-all-escorts.dto';
import { ServiceLocation } from 'database/enums/enums';

@Injectable()
export class EscortService {
  constructor(
    @InjectRepository(EscortProfile)
    private readonly escortProfileRepo: Repository<EscortProfile>,
  ) {}

  async getAllEscorts(query: GetAllEscortsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [profiles, total] = await this.escortProfileRepo.findAndCount({
      skip,
      take: limit,
      order: {
        viewCount: 'DESC',
      },
    });

    return {
      items: profiles.map((profile) => this.mapEscortListItem(profile)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEscortById(id: string) {
    const profile = await this.escortProfileRepo.findOne({
      where: { id },
      relations: { prices: true },
    });

    if (!profile) {
      throw new NotFoundException('Escort profile not found');
    }

    await this.escortProfileRepo.increment({ id }, 'viewCount', 1);

    return this.mapEscortProfile({
      ...profile,
      viewCount: (profile.viewCount ?? 0) + 1,
    } as EscortProfile & { prices?: EscortPrices[] });
  }

    async getTopViewedEscorts() {
    const profiles = await this.escortProfileRepo.find({
      order: {
        viewCount: 'DESC',
      },
      take: 10,
    });

    return {
      items: profiles.map((profile) => this.mapEscortListItem(profile)),
    };
  }

  async getVipEscorts() {
    const profiles = await this.escortProfileRepo.find({
      where: {
        vipUntil: MoreThan(new Date()),
      },
      order: {
        viewCount: 'DESC',
      },
    });

    return {
      items: profiles.map((profile) => this.mapEscortListItem(profile)),
    };
  }
  private mapEscortListItem(profile: EscortProfile) {
    const isVip = !!profile.vipUntil && new Date(profile.vipUntil) > new Date();

    return {
      id: profile.id,
      username: profile.username,
      city: profile.city,
      ethnicity: profile.ethnicity,
      gender: profile.gender,
      viewCount: profile.viewCount,
      isVerified: profile.isVerified,
      isVip,
      vipUntil: profile.vipUntil ?? null,
    };
  }

  private mapEscortProfile(profile: EscortProfile & { prices?: EscortPrices[] }) {
    const inCall =
      profile.prices?.find(
        (price) => price.serviceLocation === ServiceLocation.IN_CALL,
      ) ?? null;

    const outCall =
      profile.prices?.find(
        (price) => price.serviceLocation === ServiceLocation.OUT_CALL,
      ) ?? null;

    const isVip = !!profile.vipUntil && new Date(profile.vipUntil) > new Date();

    return {
      id: profile.id,
      username: profile.username,
      city: profile.city,
      address: profile.address,
      services: profile.services,
      height: profile.height,
      weight: profile.weight,
      ethnicity: profile.ethnicity,
      gender: profile.gender,
      languages: profile.languages,
      viewCount: profile.viewCount,
      isVerified: profile.isVerified,
      isVip,
      vipUntil: profile.vipUntil ?? null,
      prices: {
        inCall: inCall
          ? {
              price30min: inCall.price30min,
              price1hour: inCall.price1hour,
              priceWholeNight: inCall.priceWholeNight,
            }
          : null,
        outCall: outCall
          ? {
              price30min: outCall.price30min,
              price1hour: outCall.price1hour,
              priceWholeNight: outCall.priceWholeNight,
            }
          : null,
      },
    };
  }
}