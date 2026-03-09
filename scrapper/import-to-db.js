#!/usr/bin/env node
/**
 * Import scraped models from models_48xgeorgia.json into the database.
 *
 * Usage:
 *   node import-to-db.js                    # uses defaults below
 *   DB_HOST=postgres node import-to-db.js   # override via env
 *
 * No .env file is read — configure via the constants below or env vars.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ─── Config (override with env vars if needed) ──────────────────────────────
const DB = {
  host: '151.243.109.48',
  port:  '5432',
  user: 'escortadmin',
  password: 'escortsitepassword',
  database: 'elitescort_db',
};


const JSON_FILE = path.join(__dirname, 'models_48xgeorgia.json');

// ─── Georgian service name → EscortService enum ─────────────────────────────
// Georgian service names from scraped data → Georgian enum values stored in DB
// (they're the same now since enums use Georgian values directly)
const SERVICE_MAP = {
  'კლასიკური სექსი': 'კლასიკური სექსი',
  'ანალური სექსი': 'ანალური სექსი',
  'მინეტი დამცავით': 'მინეტი დამცავით',
  'მინეტი ურეზინოდ': 'მინეტი ურეზინოდ',
  'ღრმა მინეტი': 'ღრმა მინეტი',
  'პოზა 69': 'პოზა 69',
  'კოცნა': 'კოცნა',
  'კუნილინგუსი': 'კუნილინგუსი',
  'რიმინგი': 'რიმინგი',
  'ეროტიული მასაჟი': 'ეროტიული მასაჟი',
  'სტრიპტიზი': 'სტრიპტიზი',
  'სტრიპ': 'სტრიპტიზი',
  'დომინაცია': 'დომინაცია',
  'ოქროს წვიმა': 'ოქროს წვიმა',
  'სექს სათამაშოები': 'სექს სათამაშოები',
  'სექს-სათამაშოები': 'სექს სათამაშოები',
  'ფუტ ფეტიში': 'ფუტ ფეტიში',
  'ლესბო': 'ლესბო',
  'ჯგუფური': 'ჯგუფური',
  'წყვილი': 'წყვილი',
  'სახეზე': 'სახეზე',
  'პირში': 'პირში',
  'სხეულზე': 'სხეულზე',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "Юла TOP Online" → "Юла", "Mari 💋 TOP Online" → "Mari" */
function extractName(raw) {
  if (!raw) return 'Unknown';
  const stripped = raw
    .replace(/\bTOP\b/gi, '')
    .replace(/\bOnline\b/gi, '')
    .replace(/\bNEW\b/gi, '')
    .replace(/\bVIP\b/gi, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim();
  const first = stripped.split(/\s+/)[0];
  return first || raw.split(/\s+/)[0] || 'Unknown';
}

/** "23 წლის გოგო : saburtalo" → "saburtalo" */
function extractCity(address) {
  if (!address) return 'unknown';
  const parts = address.split(':');
  if (parts.length >= 2) return parts[parts.length - 1].trim().split(/\s+/)[0] || 'unknown';
  return address.trim().split(/\s+/)[0] || 'unknown';
}

/** "300 LARI" → 300, "1 LARI" → 1 */
function parseLari(str) {
  if (!str) return null;
  const m = str.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Map Georgian services array to enum values */
function mapServices(services) {
  if (!Array.isArray(services)) return [];
  return [...new Set(
    services.map(s => SERVICE_MAP[s.trim()]).filter(Boolean)
  )];
}

/** Format postgres enum array literal: {VAL1,VAL2} */
function pgEnumArray(arr) {
  if (!arr.length) return '{}';
  return `{${arr.join(',')}}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`File not found: ${JSON_FILE}`);
    process.exit(1);
  }

  const models = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  console.log(`Loaded ${models.length} models from JSON`);

  const client = new Client(DB);
  await client.connect();
  console.log(`Connected to ${DB.host}:${DB.port}/${DB.database}`);

  let created = 0, updated = 0, skipped = 0;
  const usedNames = new Map();

  for (const model of models) {
    const phone = (model.phone || '').trim();
    if (!phone) { skipped++; continue; }

    let baseName = extractName(model.name);
    const city = extractCity(model.address);
    const services = mapServices(model.services || []);

    // Ensure unique username
    const nameKey = baseName.toLowerCase();
    const count = (usedNames.get(nameKey) || 0) + 1;
    usedNames.set(nameKey, count);
    const username = count > 1 ? `${baseName}-${count}` : baseName;

    try {
      // Check if profile exists by phone
      const existing = await client.query(
        'SELECT id FROM escort_profiles WHERE "phoneNumber" = $1',
        [phone]
      );

      let profileId;

      if (existing.rows.length > 0) {
        profileId = existing.rows[0].id;
        await client.query(`
          UPDATE escort_profiles SET
            username = $1,
            city = $2,
            address = $3,
            services = $4,
            height = $5,
            weight = $6,
            age = $7,
            bio = $8,
            "viewCount" = $9,
            gender = 'მდედრობითი',
            "isVerified" = $10,
            "updatedAt" = NOW()
          WHERE id = $11
        `, [
          username,
          city,
          city,
          pgEnumArray(services),
          model.height || null,
          model.weight || null,
          model.age || null,
          model.description || null,
          model.viewCount || 0,
          model.badge === 'TOP',
          profileId,
        ]);
        updated++;
      } else {
        const res = await client.query(`
          INSERT INTO escort_profiles (
            id, "phoneNumber", username, city, address, services,
            height, weight, age, gender, bio,
            "viewCount", "isVerified", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5,
            $6, $7, $8, 'მდედრობითი', $9,
            $10, $11, NOW(), NOW()
          ) RETURNING id
        `, [
          phone,
          username,
          city,
          city,
          pgEnumArray(services),
          model.height || null,
          model.weight || null,
          model.age || null,
          model.description || null,
          model.viewCount || 0,
          model.badge === 'TOP',
        ]);
        profileId = res.rows[0].id;
        created++;
      }

      // ── Pictures ──
      await client.query('DELETE FROM escort_pictures WHERE "profileId" = $1', [profileId]);
      const pics = model.pictures || [];
      for (let i = 0; i < pics.length; i++) {
        const picPath = `/uploads/${pics[i]}`;
        await client.query(`
          INSERT INTO escort_pictures (
            id, "profileId", "picturePath", "isProfilePicture", "isExclusive", "mediaType", "createdAt", "updatedAt"
          ) VALUES (gen_random_uuid(), $1, $2, $3, false, 'image', NOW(), NOW())
        `, [profileId, picPath, i === 0]);
      }

      // ── Prices ──
      await client.query('DELETE FROM escort_prices WHERE "profileId" = $1', [profileId]);

      const incall = model.pricingIncall || {};
      if (Object.keys(incall).length > 0) {
        await client.query(`
          INSERT INTO escort_prices (
            id, "profileId", "serviceLocation",
            "price30min", "price1hour", "priceWholeNight",
            "createdAt", "updatedAt"
          ) VALUES (gen_random_uuid(), $1, 'ჩემთან', $2, $3, $4, NOW(), NOW())
        `, [
          profileId,
          parseLari(incall['30 წუთი']),
          parseLari(incall['1 საათი']),
          parseLari(incall['2 საათი']),
        ]);
      }

      const outcall = model.pricingOutcall || {};
      if (Object.keys(outcall).length > 0) {
        await client.query(`
          INSERT INTO escort_prices (
            id, "profileId", "serviceLocation",
            "price30min", "price1hour", "priceWholeNight",
            "createdAt", "updatedAt"
          ) VALUES (gen_random_uuid(), $1, 'გამოძახებით', $2, $3, $4, NOW(), NOW())
        `, [
          profileId,
          parseLari(outcall['30 წუთი']),
          parseLari(outcall['1 საათი']),
          parseLari(outcall['2 საათი']),
        ]);
      }

    } catch (err) {
      console.error(`  SKIP ${phone} (${username}): ${err.message}`);
      skipped++;
    }
  }

  await client.end();
  console.log(`\nDone. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
