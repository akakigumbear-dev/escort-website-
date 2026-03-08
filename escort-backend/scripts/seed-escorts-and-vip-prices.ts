/**
 * Seed: make all users have an escort profile (for testing), set random subscription
 * prices for VIP escorts, add fake subscriber-only content.
 *
 * Run: npm run seed:escorts
 * Or: npx ts-node -r tsconfig-paths/register -r dotenv/config --transpile-only scripts/seed-escorts-and-vip-prices.ts
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { EscortProfile } from '../database/entities/escort-profile.entity';
import { EscortPicture } from '../database/entities/escort-picture.entity';
import { EscortSubscriberPhoto } from '../database/entities/escort-subscriber-photo.entity';
import { UserRole, Gender } from '../database/enums/enums';
import * as bcrypt from 'bcrypt';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'nestuser',
    password: process.env.DB_PASS || 'nestpass',
    database: process.env.DB_NAME || 'nestdb',
    entities: [User, EscortProfile, EscortPicture, EscortSubscriberPhoto],
    synchronize: false,
  });

  await ds.initialize();
  const userRepo = ds.getRepository(User);
  const profileRepo = ds.getRepository(EscortProfile);
  const pictureRepo = ds.getRepository(EscortPicture);
  const subscriberPhotoRepo = ds.getRepository(EscortSubscriberPhoto);

  const hashed = await bcrypt.hash('seed-escort-' + Date.now(), 10);
  let profilesCreated = 0;
  let vipPricesSet = 0;
  let subscriberPhotosAdded = 0;

  // 1. Make all users escorts: give each user without escort_profile a new profile
  const users = await userRepo.find({
    relations: { escort_profile: true },
  });

  for (const user of users) {
    if (user.escort_profile) {
      continue;
    }
    const base = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'user';
    const suffix = user.id.replace(/-/g, '').slice(0, 8);
    const username = `escort-${base}-${suffix}`;
    const phoneNumber = `+9955${user.id.replace(/-/g, '').slice(0, 9)}`;
    const existingPhone = await profileRepo.findOne({ where: { phoneNumber } });
    const existingUser = await profileRepo.findOne({ where: { username } });
    const finalPhone = existingPhone ? `+9955${user.id.replace(/-/g, '').slice(0, 8)}9` : phoneNumber;
    const finalUsername = existingUser ? `escort-${base}-${suffix}-2` : username;

    const profile = profileRepo.create({
      phoneNumber: finalPhone,
      username: finalUsername,
      city: 'Tbilisi',
      address: 'Tbilisi',
      gender: Gender.FEMALE,
      languages: [],
      services: [],
      serviceItems: [],
      viewCount: 0,
      isVerified: false,
      user,
    });
    await profileRepo.save(profile);
    user.role = UserRole.ESCORT;
    await userRepo.save(user);
    profilesCreated++;
  }

  console.log(`Created ${profilesCreated} escort profiles for users that had none.`);

  // 2. Set random subscription price for all VIP profiles (vipUntil > now)
  const now = new Date();
  const vipProfiles = await profileRepo.find({
    where: {},
  });
  const vipFiltered = vipProfiles.filter((p) => p.vipUntil && new Date(p.vipUntil) > now);

  for (const profile of vipFiltered) {
    const price = randomInt(15, 99);
    (profile as any).subscriptionPriceGel = price;
    await profileRepo.save(profile);
    vipPricesSet++;
  }

  console.log(`Set random subscription price (15–99₾) for ${vipPricesSet} VIP profiles.`);

  // 3. Add fake subscriber-only content: for profiles that have at least one picture,
  //    add 1–2 copies to escort_subscriber_photos (so there is something to unlock)
  const profilesWithPictures = await profileRepo.find({
    relations: { pictures: true },
  });

  for (const profile of profilesWithPictures) {
    const pics = profile.pictures ?? [];
    if (pics.length === 0) continue;
    const existingSub = await subscriberPhotoRepo.find({ where: { profileId: profile.id } });
    if (existingSub.length >= 2) continue;
    const toAdd = Math.min(2 - existingSub.length, Math.min(2, pics.length));
    const usedPaths = new Set(existingSub.map((s) => s.picturePath));
    let added = 0;
    for (const pic of pics) {
      if (added >= toAdd || usedPaths.has(pic.picturePath)) continue;
      const row = subscriberPhotoRepo.create({
        profileId: profile.id,
        picturePath: pic.picturePath,
        sortOrder: existingSub.length + added,
      });
      await subscriberPhotoRepo.save(row);
      usedPaths.add(pic.picturePath);
      added++;
      subscriberPhotosAdded++;
    }
  }

  console.log(`Added ${subscriberPhotosAdded} fake subscriber-only photos.`);

  await ds.destroy();
  console.log('Seed done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
