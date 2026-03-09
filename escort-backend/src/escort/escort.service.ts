import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { GetAllEscortsDto } from './dtos/get-all-escorts.dto';
import { mapEscortProfile } from './mappers/escort-profile.mapper';
import { mapEscortListItem } from './mappers/escort-list-item.mapper';
import { Gender, Ethnicity } from 'database/enums/enums';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class EscortService {
  constructor(
    @InjectRepository(EscortProfile)
    private readonly escortProfileRepo: Repository<EscortProfile>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async getEscortById(id: string, viewerUserId?: string | null) {
    const profile = await this.escortProfileRepo.findOne({
      where: { id },
      relations: { prices: true },
    });

    if (!profile) {
      throw new NotFoundException('Escort profile not found');
    }

    let pictures: EscortProfile['pictures'] = [];
    let subscriberPhotos: Array<{
      id: string;
      picturePath: string;
      sortOrder: number;
    }> = [];
    try {
      const withPictures = await this.escortProfileRepo.findOne({
        where: { id },
        relations: { pictures: true, subscriberPhotos: true },
      });
      pictures = withPictures?.pictures ?? [];
      subscriberPhotos =
        (withPictures as any)?.subscriberPhotos?.map((sp: any) => ({
          id: sp.id,
          picturePath: sp.picturePath,
          sortOrder: sp.sortOrder ?? 0,
        })) ?? [];
    } catch {
      // escort_pictures.isExclusive or escort_subscriber_photos may be missing
    }

    let reviews: EscortProfile['reviews'] = [];
    try {
      const withReviews = await this.escortProfileRepo.findOne({
        where: { id },
        relations: { reviews: true },
      });
      reviews = withReviews?.reviews ?? [];
    } catch {
      // reviews->user may fail if user.role missing
    }

    (profile as any).pictures = pictures;
    (profile as any).reviews = reviews;

    let ownerUserId: string | null = null;
    try {
      const raw = await this.escortProfileRepo
        .createQueryBuilder('p')
        .select('p.userId', 'userId')
        .where('p.id = :id', { id })
        .getRawOne<{ userId: string }>();
      ownerUserId = raw?.userId ?? null;
    } catch {
      // column may not exist in DB
    }

    await this.escortProfileRepo.increment({ id }, 'viewCount', 1);

    let subscribed = false;
    if (viewerUserId) {
      try {
        subscribed = await this.subscriptionService.isSubscribed(
          viewerUserId,
          id,
        );
      } catch {
        // subscriptions table may not exist yet
      }
    }

    const allPictures = profile.pictures ?? [];
    const exclusiveFromPictures = allPictures.filter(
      (p) => (p as any).isExclusive,
    ).length;
    const exclusiveCount = exclusiveFromPictures + subscriberPhotos.length;
    const basePicturesToShow = subscribed
      ? allPictures
      : allPictures.filter((p) => !(p as any).isExclusive);
    const subscriberPhotosAsPictures = subscribed
      ? subscriberPhotos.map((sp) => ({
          id: sp.id,
          picturePath: sp.picturePath,
          isProfilePicture: false,
          isExclusive: true,
          createdAt: new Date(),
        }))
      : [];
    const picturesToShow = [
      ...basePicturesToShow,
      ...subscriberPhotosAsPictures,
    ];

    const subscriptionPriceGel =
      profile.subscriptionPriceGel != null
        ? Number(profile.subscriptionPriceGel)
        : null;

    const profileForMap = {
      ...profile,
      viewCount: (profile.viewCount ?? 0) + 1,
      pictures: picturesToShow,
      exclusiveMediaCount: subscribed ? 0 : exclusiveCount,
      subscribed,
      ownerUserId,
      subscriptionPriceGel,
    };

    return mapEscortProfile(profileForMap as any);
  }

  async getAllEscorts(query: GetAllEscortsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'viewCount';
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.escortProfileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.pictures', 'pictures')
      .leftJoinAndSelect('profile.reviews', 'reviews');

    if (query.search?.trim()) {
      const term = `%${query.search.trim().replace(/%/g, '\\%')}%`;
      qb.andWhere(
        '(profile.username ILIKE :term OR profile.phoneNumber ILIKE :term)',
        { term },
      );
    }

    if (query.city?.trim()) {
      qb.andWhere('profile.city ILIKE :city', {
        city: `%${query.city.trim()}%`,
      });
    }

    if (query.minAge != null) {
      qb.andWhere('profile.age >= :minAge', { minAge: query.minAge });
    }
    if (query.maxAge != null) {
      qb.andWhere('profile.age <= :maxAge', { maxAge: query.maxAge });
    }
    if (query.minHeight != null) {
      qb.andWhere('profile.height >= :minHeight', {
        minHeight: query.minHeight,
      });
    }
    if (query.maxHeight != null) {
      qb.andWhere('profile.height <= :maxHeight', {
        maxHeight: query.maxHeight,
      });
    }
    if (query.minWeight != null) {
      qb.andWhere('profile.weight >= :minWeight', {
        minWeight: query.minWeight,
      });
    }
    if (query.maxWeight != null) {
      qb.andWhere('profile.weight <= :maxWeight', {
        maxWeight: query.maxWeight,
      });
    }

    if (query.gender) {
      qb.andWhere('profile.gender = :gender', { gender: query.gender });
    }
    if (query.ethnicity) {
      qb.andWhere('profile.ethnicity = :ethnicity', {
        ethnicity: query.ethnicity,
      });
    }

    if (query.minPrice != null || query.maxPrice != null) {
      const priceSub =
        'SELECT 1 FROM escort_prices p WHERE p.profileId = profile.id AND ';
      if (query.minPrice != null && query.maxPrice != null) {
        qb.andWhere(
          `EXISTS (${priceSub} (
            (p.price30min BETWEEN :minPrice AND :maxPrice) OR
            (p.price1hour BETWEEN :minPrice AND :maxPrice) OR
            (p.priceWholeNight BETWEEN :minPrice AND :maxPrice)
          ))`,
          { minPrice: query.minPrice, maxPrice: query.maxPrice },
        );
      } else if (query.minPrice != null) {
        qb.andWhere(
          `EXISTS (${priceSub} (
            p.price30min >= :minPrice OR p.price1hour >= :minPrice OR p.priceWholeNight >= :minPrice
          ))`,
          { minPrice: query.minPrice },
        );
      } else {
        qb.andWhere(
          `EXISTS (${priceSub} (
            (p.price30min IS NOT NULL AND p.price30min <= :maxPrice) OR
            (p.price1hour IS NOT NULL AND p.price1hour <= :maxPrice) OR
            (p.priceWholeNight IS NOT NULL AND p.priceWholeNight <= :maxPrice)
          ))`,
          { maxPrice: query.maxPrice! },
        );
      }
    }

    const orderField =
      sortBy === 'username'
        ? 'profile.username'
        : sortBy === 'createdAt'
          ? 'profile.createdAt'
          : 'profile.viewCount';
    qb.orderBy(orderField, sortOrder);
    qb.skip(skip).take(limit);

    const [profiles, total] = await qb.getManyAndCount();

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

  async getFilterOptions() {
    const cities = await this.escortProfileRepo
      .createQueryBuilder('profile')
      .select('DISTINCT profile.city')
      .orderBy('profile.city', 'ASC')
      .getRawMany()
      .then((rows) => rows.map((r) => r.city as string).filter(Boolean));

    return {
      cities,
      genders: Object.values(Gender),
      ethnicities: Object.values(Ethnicity),
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

  async getAllProfileIds(): Promise<{ id: string; updatedAt: string }[]> {
    const profiles = await this.escortProfileRepo.find({
      select: ['id', 'updatedAt'],
      order: { updatedAt: 'DESC' },
    });
    return profiles.map((p) => ({
      id: p.id,
      updatedAt: (p.updatedAt ?? p.createdAt)?.toISOString?.() ?? new Date().toISOString(),
    }));
  }
}
