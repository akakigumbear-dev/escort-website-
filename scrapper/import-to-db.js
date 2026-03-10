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

/**
 * Extract clean city from the scraped `city` or `address` field.
 * "saburtalo ქალაქი" → "saburtalo"
 * "23 წლის გოგო : saburtalo" → "saburtalo"
 * "other ქალაქი" → "tbilisi"
 */
function extractCity(model) {
  // Prefer the `city` field, fallback to `address`
  let raw = (model.city || model['ქალაქი'] || '').trim();

  if (raw) {
    // Strip trailing "ქალაქი" (means "city")
    raw = raw.replace(/\s*ქალაქი\s*$/i, '').trim();
  }

  if (!raw || raw === 'other') {
    // Try extracting from address: "23 წლის გოგო : saburtalo"
    const addr = model.address || model['მისამართი'] || '';
    const parts = addr.split(':');
    if (parts.length >= 2) {
      raw = parts[parts.length - 1].trim().split(/\s+/)[0] || '';
    }
  }

  if (!raw || raw === 'other') return 'tbilisi';
  return raw.toLowerCase();
}

/**
 * Detect ethnicity from description text and name.
 * Returns a valid DB enum value or null.
 */
function detectEthnicity(model) {
  const desc = (model.description || model['აღწერა'] || '').toLowerCase();
  const name = (model.name || model['სახელი'] || '').toLowerCase();
  const combined = `${desc} ${name}`;

  const patterns = [
    { keywords: ['asia', 'აზი', 'asian', 'აზიელი'], value: 'აზიელი' },
    { keywords: ['ukrain', 'უკრაინ', 'україн'], value: 'უკრაინელი' },
    { keywords: ['russian', 'русск', 'რუს', 'россия', 'москва', 'из росси'], value: 'რუსი' },
    { keywords: ['turkey', 'türk', 'თურქ', 'turkish'], value: 'თურქი' },
    { keywords: ['azerbaij', 'azərbaycan', 'აზერბაიჯან'], value: 'აზერბაიჯანელი' },
    { keywords: ['europe', 'ევროპ', 'european'], value: 'ევროპელი' },
    { keywords: ['latin', 'ლათინ', 'latina', 'latino'], value: 'ლათინო' },
    { keywords: ['arab', 'არაბ', 'middle east', 'აღმოსავლ'], value: 'ახლო აღმოსავლელი' },
    { keywords: ['mixed', 'შერეულ'], value: 'შერეული' },
    { keywords: ['georgia', 'საქართველ', 'ქართველ'], value: 'ქართველი' },
  ];

  for (const { keywords, value } of patterns) {
    for (const kw of keywords) {
      if (combined.includes(kw)) return value;
    }
  }

  return null;
}

/**
 * Detect languages from description text (presence of script/keywords).
 * Returns array of valid DB enum values.
 */
function detectLanguages(model) {
  const desc = (model.description || model['აღწერა'] || '').toLowerCase();
  const langs = [];

  // Georgian script
  if (/[\u10D0-\u10FF]{3,}/.test(desc)) langs.push('ქართული');
  // Russian script (Cyrillic)
  if (/[а-яё]{3,}/i.test(desc)) langs.push('რუსული');
  // English (Latin words)
  if (/[a-z]{4,}/i.test(desc)) langs.push('ინგლისური');
  // Turkish characters
  if (/[şçğıüö]/i.test(desc)) langs.push('თურქული');
  // Ukrainian
  if (/[іїєґ]/i.test(desc)) langs.push('უკრაინული');

  return langs;
}

/** "300 LARI" → 300, "1 LARI" → 1, "11111111111 LARI" → null (garbage) */
function parseLari(str) {
  if (!str) return null;
  const m = str.match(/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  // sanity cap: real prices are under 100 000 GEL
  if (isNaN(n) || n > 100000) return null;
  return n;
}

/**
 * Clamp a numeric field to a sane range, returns null if out of range or not a number.
 * Prevents "value out of range for type integer" errors from garbage scraped data.
 */
function safeInt(value, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(String(value).replace(/\D/g, ''), 10);
  if (isNaN(n) || n < min || n > max) return null;
  return n;
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

  // Wipe all escort-related data before re-import
  console.log('Cleaning database...');
  await client.query('TRUNCATE escort_pictures, escort_prices, escort_reviews, escort_subscriber_photos, subscriptions, escort_profiles CASCADE');
  console.log('Database cleaned. Starting import...\n');

  let created = 0, skipped = 0;
  const usedNames = new Map();

  for (const model of models) {
    const phone = (model.phone || '').trim();
    if (!phone) { skipped++; continue; }

    let baseName = extractName(model.name);
    const city = extractCity(model);
    const services = mapServices(model.services || model['სერვისები'] || []);
    const height = safeInt(model.height || model['სიმაღლე'], 100, 220);
    const weight = safeInt(model.weight || model['წონა'],  30, 200);
    const age    = safeInt(model.age    || model['გოგო'],   18,  80);
    const ethnicity = detectEthnicity(model);
    const languages = detectLanguages(model);

    // Ensure unique username
    const nameKey = baseName.toLowerCase();
    const count = (usedNames.get(nameKey) || 0) + 1;
    usedNames.set(nameKey, count);
    const username = count > 1 ? `${baseName}-${count}` : baseName;

    try {
      const res = await client.query(`
        INSERT INTO escort_profiles (
          id, "phoneNumber", username, city, address, services,
          height, weight, age, gender, bio,
          "viewCount", "isVerified", ethnicity, languages,
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, 'მდედრობითი', $9,
          $10, $11, $12, $13, NOW(), NOW()
        ) RETURNING id
      `, [
        phone,
        username,
        city,
        city,
        pgEnumArray(services),
        height,
        weight,
        age,
        model.description || model['აღწერა'] || null,
        model.viewCount || 0,
        model.badge === 'TOP',
        ethnicity,
        pgEnumArray(languages),
      ]);
      const profileId = res.rows[0].id;
      created++;

      // ── Pictures ──
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

      if (created % 50 === 0) console.log(`  ... ${created} profiles imported`);

    } catch (err) {
      console.error(`  SKIP ${phone} (${username}): ${err.message}`);
      skipped++;
    }
  }

  await client.end();
  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
