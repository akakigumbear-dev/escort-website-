import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EscortPrices } from 'database/entities/escort-price.entity';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { User } from 'database/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateEscortProfileDto } from './dtos/create-escort-profile.dto';
import { UpsertPricesDto } from './dtos/upsert-prices.dto';
import { UpdateEscortProfileDto } from './dtos/update-escort-profile.dto';
import { EscortPicture } from 'database/entities/escort-picture.entity';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(EscortProfile)
    private readonly profiles: Repository<EscortProfile>,
    @InjectRepository(EscortPrices)
    private readonly prices: Repository<EscortPrices>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(EscortPicture)
    private readonly escortPictureRepo: Repository<EscortPicture>,
  ) {}

  async createEscortProfile(userId: string, dto: CreateEscortProfileDto) {
    const exists = await this.profiles.findOne({
      where: { user: { id: userId } } as any,
    });
    if (exists) throw new BadRequestException('Escort profile already exists');

    const usernameTaken = await this.profiles.findOne({
      where: { username: dto.username },
    });
    if (usernameTaken) throw new BadRequestException('Username already taken');

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const profile = this.profiles.create({
      ...dto,
      user,
      isVerified: false,
      viewCount: 0,
      vipUntil: null,
      prices: [],
    } as any);

    return this.profiles.save(profile);
  }

  async getMyEscortProfile(userId: string) {
    const profile = await this.profiles.findOne({
      where: { user: { id: userId } } as any,
      relations: { prices: true, user: true } as any,
    });

    if (!profile) throw new NotFoundException('Escort profile not found');
    return profile;
  }

  async editEscortProfile(userId: string, dto: UpdateEscortProfileDto) {
    const profile = await this.profiles.findOne({
      where: { user: { id: userId } } as any,
    });
    if (!profile) throw new NotFoundException('Escort profile not found');

    Object.assign(profile, dto);
    return this.profiles.save(profile);
  }

  async activateEscortProfile(userId: string) {
    const profile = await this.profiles.findOne({
      where: { user: { id: userId } } as any,
    });
    if (!profile) throw new NotFoundException('Escort profile not found');

    profile.isVerified = true; // თუ “activate” შენს ლოგიკაში სხვა რამეა, აქ შეცვალე
    return this.profiles.save(profile);
  }

  async purchaseVipProfile(userId: string, dto: any) {
    const profile = await this.profiles.findOne({
      where: { user: { id: userId } } as any,
    });
    if (!profile) throw new NotFoundException('Escort profile not found');

    const now = new Date();
    const base =
      profile.vipUntil && profile.vipUntil > now ? profile.vipUntil : now;
    const vipUntil = new Date(base.getTime() + dto.days * 24 * 60 * 60 * 1000);

    profile.vipUntil = vipUntil;
    return this.profiles.save(profile);
  }

  async upsertPrices(userId: string, dto: UpsertPricesDto) {
    const profile = await this.profiles.findOne({
      where: { user: { id: userId } } as any,
    });
    if (!profile) throw new NotFoundException('Escort profile not found');

    // Unique(['profile','serviceLocation']) - ამიტომ upsert by serviceLocation
    let row = await this.prices.findOne({
      where: {
        profile: { id: profile.id },
        serviceLocation: dto.serviceLocation,
      } as any,
    });

    if (!row) {
      row = this.prices.create({
        profile,
        serviceLocation: dto.serviceLocation,
        price30min: dto.price30min ?? null,
        price1hour: dto.price1hour ?? null,
        priceWholeNight: dto.priceWholeNight ?? null,
      });
    } else {
      Object.assign(row, {
        price30min: dto.price30min ?? row.price30min,
        price1hour: dto.price1hour ?? row.price1hour,
        priceWholeNight: dto.priceWholeNight ?? row.priceWholeNight,
      });
    }

    return this.prices.save(row);
  }

  async editPrices(userId: string, priceId: string, dto: any) {
    const profile = await this.profiles.findOne({
      where: { user: { id: userId } } as any,
    });
    if (!profile) throw new NotFoundException('Escort profile not found');

    const row = await this.prices.findOne({
      where: { id: priceId },
      relations: { profile: true } as any,
    });
    if (!row) throw new NotFoundException('Price row not found');

    if (row.profile.id !== profile.id)
      throw new ForbiddenException('Not your price row');

    Object.assign(row, dto);
    return this.prices.save(row);
  }

  async uploadPictures(userId: string, files: Express.Multer.File[]) {
    const profile = await this.profiles.findOne({
      where: { user: { id: userId } as any },
      relations: { pictures: true },
    });

    if (!profile) {
      throw new NotFoundException('Escort profile not found');
    }

    if (!files?.length) {
      throw new BadRequestException('No files uploaded');
    }

    const existingCount = profile.pictures?.length ?? 0;
    if (existingCount + files.length > 20) {
      throw new BadRequestException('Maximum 20 pictures allowed');
    }

    const pictures = files.map((file, index) =>
      this.escortPictureRepo.create({
        profileId: profile.id,
        picturePath: `/uploads/escort-pictures/${file.filename}`,
        isProfilePicture: existingCount === 0 && index === 0,
      }),
    );

    const savedPictures = await this.escortPictureRepo.save(pictures);

    return {
      items: savedPictures.map((picture) => ({
        id: picture.id,
        picturePath: picture.picturePath,
        isProfilePicture: picture.isProfilePicture,
      })),
    };
  }

  async deletePicture(userId: string, pictureId: string) {
    const profile = await this.profiles.findOne({
      where: { user: { id: userId } as any },
      relations: { pictures: true },
    });

    if (!profile) {
      throw new NotFoundException('Escort profile not found');
    }

    const picture = profile.pictures.find((item) => item.id === pictureId);

    if (!picture) {
      throw new NotFoundException('Picture not found');
    }

    await this.escortPictureRepo.remove(picture);

    const filePath = join(
      process.cwd(),
      picture.picturePath.replace(/^\//, ''),
    );

    try {
      await unlink(filePath);
    } catch {
      // ignore
    }

    if (picture.isProfilePicture) {
      const nextPicture = await this.escortPictureRepo.findOne({
        where: { profileId: profile.id },
        order: { createdAt: 'ASC' },
      });

      if (nextPicture) {
        nextPicture.isProfilePicture = true;
        await this.escortPictureRepo.save(nextPicture);
      }
    }

    return { ok: true };
  }

  async setProfilePicture(userId: string, pictureId: string) {
    const profile = await this.profiles.findOne({
      where: { user: { id: userId } as any },
      relations: { pictures: true },
    });

    if (!profile) {
      throw new NotFoundException('Escort profile not found');
    }

    const target = profile.pictures.find((picture) => picture.id === pictureId);

    if (!target) {
      throw new NotFoundException('Picture not found');
    }

    for (const picture of profile.pictures) {
      picture.isProfilePicture = picture.id === pictureId;
    }

    await this.escortPictureRepo.save(profile.pictures);

    return {
      ok: true,
      profilePicture: {
        id: target.id,
        picturePath: target.picturePath,
      },
    };
  }
}
