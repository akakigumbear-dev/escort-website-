/**
 * Import scraped JSON data into PostgreSQL.
 * Run: npx ts-node --project tsconfig.json scripts/import-scraped-data.ts
 * Or: npm run import:scraped
 *
 * Expects JSON files at ../scrapper/models.json and ../scrapper/models_48xgeorgia.json
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { EscortProfile } from '../database/entities/escort-profile.entity';
import { EscortPicture } from '../database/entities/escort-picture.entity';
import { EscortPrices } from '../database/entities/escort-price.entity';
import { EscortReview } from '../database/entities/escort-review.entity';
import { User } from '../database/entities/user.entity';
import { Ethnicity, Gender, Language, ServiceLocation } from '../database/enums/enums';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const SCRAPPER_DIR = path.join(__dirname, '../../scrapper');
const MODELS_JSON = path.join(SCRAPPER_DIR, 'models.json');
const MODELS_48X_JSON = path.join(SCRAPPER_DIR, 'models_48xgeorgia.json');

// Language name -> enum
const LANG_MAP: Record<string, Language> = {
  'English': Language.EN,
  'ქართული': Language.KA,
  'Русский': Language.RU,
  'Türkçe': Language.TR,
  'Украiньска': Language.UK,
  'Ukrainskа': Language.UK,
};

// Ethnicity code -> enum
const ETH_MAP: Record<string, Ethnicity> = {
  'GE': Ethnicity.GE,
  'UA': Ethnicity.UA,
  'RU': Ethnicity.RU,
  'TR': Ethnicity.TR,
  'AZ': Ethnicity.AZ,
  'Other': Ethnicity.OTHER,
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 9 && !raw.startsWith('+')) {
    return '+995' + digits.slice(-9);
  }
  return raw.startsWith('+') ? raw : '+' + raw;
}

function parseAge(val: string | number): number | undefined {
  if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
  const m = String(val).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}

function parseCm(val: string | number): number | undefined {
  if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
  const m = String(val).match(/(\d+)\s*სმ|(\d+)/);
  return m ? parseInt(m[1] || m[2], 10) : undefined;
}

function parseKg(val: string | number): number | undefined {
  if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
  const m = String(val).match(/(\d+)\s*კგ|(\d+)/);
  return m ? parseInt(m[1] || m[2], 10) : undefined;
}

function parsePrice(str: string): number | undefined {
  const m = String(str).match(/(\d+)/);
  if (!m) return undefined;
  const val = parseInt(m[1], 10);
  if (!Number.isFinite(val)) return undefined;
  return val <= 2_000_000 ? val : undefined; // Cap to fit PostgreSQL int
}

function extractLanguages(langStr: string): Language[] {
  const seen = new Set<Language>();
  const parts = langStr.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    const l = LANG_MAP[p];
    if (l) seen.add(l);
  }
  return [...seen];
}

// --- models.json (eskorti.ge) ---
interface EskortiRecord {
  'გოგო'?: string;
  'ენები'?: string;
  'ეროვნება'?: string;
  'სახელი'?: string;
  'სიმაღლე'?: string;
  'სურათები'?: string[];
  'ტელეფონი'?: string;
  'ქალაქი'?: string;
  'ქვეყანა'?: string;
  'წონა'?: string;
  url?: string;
}

// --- models_48xgeorgia.json ---
interface Record48x {
  phone?: string;
  name?: string;
  city?: string;
  address?: string;
  age?: number;
  height?: number;
  weight?: number;
  description?: string;
  ethnicity?: string;
  pictures?: string[];
  services?: string[];
  viewCount?: number;
  badge?: string;
  incall?: boolean;
  outcall?: boolean;
  pricingIncall?: Record<string, string>;
  pricingOutcall?: Record<string, string>;
}

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'nestuser',
    password: process.env.DB_PASS || 'nestpass',
    database: process.env.DB_NAME || 'nestdb',
    entities: [User, EscortProfile, EscortPicture, EscortPrices, EscortReview],
    synchronize: false,
  });

  await ds.initialize();
  const profileRepo = ds.getRepository(EscortProfile);
  const pictureRepo = ds.getRepository(EscortPicture);
  const priceRepo = ds.getRepository(EscortPrices);
  const userRepo = ds.getRepository(User);

  const hashed = await bcrypt.hash('import-placeholder-' + Date.now(), 10);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  // VIP: ~25% of profiles get vipUntil (30 days from now)
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // 1. Import models.json (eskorti.ge)
  if (fs.existsSync(MODELS_JSON)) {
    const data: EskortiRecord[] = JSON.parse(fs.readFileSync(MODELS_JSON, 'utf-8'));
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      const phone = r['ტელეფონი'] ? normalizePhone(r['ტელეფონი']) : null;
      const digits = phone ? phone.replace(/\D/g, '') : '';
      if (!phone || digits.length < 9) {
        skipped++;
        continue;
      }

      let profile = await profileRepo.findOne({ where: { phoneNumber: phone } });
      if (!profile) {
        const user = userRepo.create({
          email: `import-eskorti-${digits}@escort-import.local`,
          password: hashed,
        });
        await userRepo.save(user);

        const baseName = (r['სახელი'] || '').trim().replace(/[^\w\s\u10A0-\u10FF\-]/g, '').slice(0, 40) || 'escort';
        const uniqueName = `eskorti-${baseName}-${phone.replace(/\D/g, '').slice(-6)}`;
        profile = profileRepo.create({
          phoneNumber: phone,
          username: uniqueName,
          city: r['ქალაქი'] || 'Tbilisi',
          address: r['ქალაქი'] || '',
          height: parseCm(r['სიმაღლე'] ?? ''),
          weight: parseKg(r['წონა'] ?? ''),
          age: parseAge(r['გოგო'] ?? ''),
          ethnicity: r['ეროვნება'] ? ETH_MAP[r['ეროვნება']] : undefined,
          gender: Gender.FEMALE,
          languages: r['ენები'] ? extractLanguages(r['ენები']) : [],
          serviceItems: [],
          viewCount: 0,
          isVerified: false,
          vipUntil: i % 4 === 0 ? thirtyDaysFromNow : null,
          user,
        });
        await profileRepo.save(profile);
        created++;
      } else {
        if (!profile.vipUntil || new Date(profile.vipUntil) <= new Date()) {
          profile.vipUntil = i % 4 === 0 ? thirtyDaysFromNow : null;
          await profileRepo.save(profile);
        }
        updated++;
      }

      const pics = r['სურათები'] || [];
      const existing = await pictureRepo.find({ where: { profileId: profile.id } });
      const existingPaths = new Set(existing.map((p) => p.picturePath));
      for (let i = 0; i < pics.length; i++) {
        const p = pics[i];
        if (existingPaths.has(p)) continue;
        const pic = pictureRepo.create({
          profileId: profile.id,
          picturePath: p,
          isProfilePicture: i === 0 && existing.length === 0,
        });
        await pictureRepo.save(pic);
      }
    }
    console.log(`models.json: processed ${data.length} records`);
  }

  // 2. Import models_48xgeorgia.json
  if (fs.existsSync(MODELS_48X_JSON)) {
    const data: Record48x[] = JSON.parse(fs.readFileSync(MODELS_48X_JSON, 'utf-8'));
    for (const r of data) {
      const phone = r.phone ? normalizePhone(r.phone) : null;
      const digits = phone ? phone.replace(/\D/g, '') : '';
      if (!phone || digits.length < 9) {
        skipped++;
        continue;
      }

      let profile = await profileRepo.findOne({ where: { phoneNumber: phone } });
      if (!profile) {
        const user = userRepo.create({
          email: `import-48x-${digits}@escort-import.local`,
          password: hashed,
        });
        await userRepo.save(user);

        const baseName = (r.name || '').trim().replace(/[^\w\s\u10A0-\u10FF\-]/g, '').slice(0, 40) || 'escort';
        const uniqueName = `48x-${baseName}-${phone.replace(/\D/g, '').slice(-6)}`;

        profile = profileRepo.create({
          phoneNumber: phone,
          username: uniqueName,
          city: r.city || 'Tbilisi',
          address: r.address || r.city || '',
          height: r.height,
          weight: r.weight,
          age: r.age,
          bio: r.description || null,
          ethnicity: r.ethnicity ? ETH_MAP[r.ethnicity] : undefined,
          gender: Gender.FEMALE,
          languages: [],
          serviceItems: r.services || [],
          viewCount: r.viewCount ?? 0,
          isVerified: r.badge === 'TOP',
          vipUntil: r.badge === 'TOP' || Math.random() < 0.2 ? thirtyDaysFromNow : null,
          user,
        });
        await profileRepo.save(profile);
        created++;

        // EscortPrices from pricingIncall / pricingOutcall
        if (r.incall && r.pricingIncall) {
          const p30 = r.pricingIncall['30 წუთი'] ? parsePrice(r.pricingIncall['30 წუთი']) : undefined;
          const p1 = r.pricingIncall['1 საათი'] ? parsePrice(r.pricingIncall['1 საათი']) : undefined;
          const p2 = r.pricingIncall['2 საათი'] ? parsePrice(r.pricingIncall['2 საათი']) : undefined;
          if (p30 || p1 || p2) {
            const priceRow = priceRepo.create({
              profile,
              serviceLocation: ServiceLocation.IN_CALL,
              price30min: p30 ?? null,
              price1hour: p1 ?? null,
              priceWholeNight: p2 ?? null,
            });
            await priceRepo.save(priceRow);
          }
        }
        if (r.outcall && r.pricingOutcall) {
          const p30 = r.pricingOutcall['30 წუთი'] ? parsePrice(r.pricingOutcall['30 წუთი']) : undefined;
          const p1 = r.pricingOutcall['1 საათი'] ? parsePrice(r.pricingOutcall['1 საათი']) : undefined;
          const p2 = r.pricingOutcall['2 საათი'] ? parsePrice(r.pricingOutcall['2 საათი']) : undefined;
          if (p30 || p1 || p2) {
            const priceRow = priceRepo.create({
              profile,
              serviceLocation: ServiceLocation.OUT_CALL,
              price30min: p30 ?? null,
              price1hour: p1 ?? null,
              priceWholeNight: p2 ?? null,
            });
            await priceRepo.save(priceRow);
          }
        }
      } else {
        // Update existing: bio, serviceItems, viewCount, VIP if we have new data
        if (r.description && !profile.bio) profile.bio = r.description;
        if (r.services?.length) profile.serviceItems = r.services;
        if (r.viewCount != null) profile.viewCount = r.viewCount;
        if (r.badge === 'TOP') {
          profile.isVerified = true;
          profile.vipUntil = thirtyDaysFromNow;
        }
        await profileRepo.save(profile);
        updated++;
      }

      const pics = r.pictures || [];
      const existing = await pictureRepo.find({ where: { profileId: profile.id } });
      const existingPaths = new Set(existing.map((p) => p.picturePath));
      for (let i = 0; i < pics.length; i++) {
        const p = pics[i];
        if (existingPaths.has(p)) continue;
        const pic = pictureRepo.create({
          profileId: profile.id,
          picturePath: p,
          isProfilePicture: i === 0 && existing.length === 0,
        });
        await pictureRepo.save(pic);
      }
    }
    console.log(`models_48xgeorgia.json: processed ${data.length} records`);
  }

  await ds.destroy();
  console.log(`Done. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
