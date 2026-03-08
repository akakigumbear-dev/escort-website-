import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { EscortPrices } from 'database/entities/escort-price.entity';
import { GetAllEscortsDto } from './dtos/get-all-escorts.dto';
import { ServiceLocation } from 'database/enums/enums';
import { mapEscortProfile } from './mappers/escort-profile.mapper';
import { mapEscortListItem } from './mappers/escort-list-item.mapper';
@Injectable()
export class EscortService {
  constructor(
    @InjectRepository(EscortProfile)
    private readonly escortProfileRepo: Repository<EscortProfile>,
  ) {}


async getEscortById(id: string) {
  const profile = await this.escortProfileRepo.findOne({
    where: { id },
    relations: { prices: true, reviews: true, pictures: true },
  });

  if (!profile) {
    throw new NotFoundException('Escort profile not found');
  }

  await this.escortProfileRepo.increment({ id }, 'viewCount', 1);

  return mapEscortProfile({
    ...profile,
    viewCount: (profile.viewCount ?? 0) + 1,
  });
}
async getAllEscorts(query: GetAllEscortsDto) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const [profiles, total] = await this.escortProfileRepo.findAndCount({
    relations: { pictures: true, reviews: true },
    skip,
    take: limit,
    order: {
      viewCount: 'DESC',
    },
  });

  return {
    items: profiles.map((profile) => mapEscortListItem(profile)),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async getTopViewedEscorts() {
  const profiles = await this.escortProfileRepo.find({
    relations: { pictures: true },
    order: {
      viewCount: 'DESC',
    },
    take: 10,
  });

  return {
    items: profiles.map((profile) => mapEscortListItem(profile)),
  };
}

async getVipEscorts() {
  const profiles = await this.escortProfileRepo.find({
    relations: { pictures: true, reviews: true },
    where: {
      vipUntil: MoreThan(new Date()),
    },
    order: {
      viewCount: 'DESC',
    },
  });

  return {
    items: profiles.map((profile) => mapEscortListItem(profile)),
  };
}

}