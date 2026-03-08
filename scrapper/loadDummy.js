const fs = require('fs');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'companion',
});

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const ETHNICITIES = [
  'EUROPEAN',
  'ASIAN',
  'LATIN',
  'MIDDLE_EASTERN',
  'MIXED',
  'OTHER',
];
const LANGUAGES = ['EN', 'KA', 'RU', 'ES', 'FR'];
const SERVICES = [
  'DINNER',
  'EVENT',
  'TRAVEL',
  'CITY_GUIDE',
  'BUSINESS_EVENT',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBool(probability = 0.5) {
  return Math.random() < probability;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomSubset(arr, min = 1, max = arr.length) {
  const copy = [...arr].sort(() => Math.random() - 0.5);
  const count = randomInt(min, Math.min(max, arr.length));
  return copy.slice(0, count);
}

function extractNumber(value) {
  if (!value) return null;
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function normalizeString(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const v = String(value).trim();
  return v || fallback;
}

function slugifyUsername(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function randomPhone() {
  return `5${randomInt(10, 99)}${randomInt(1000000, 9999999)}`;
}

function randomUsername(base = 'model') {
  return `${slugifyUsername(base) || 'model'}_${randomInt(1000, 999999)}`;
}

function mapGender(rawName) {
  if (!rawName) return 'FEMALE';
  const value = String(rawName).toLowerCase();

  if (value.includes('male')) return 'MALE';
  if (value.includes('female')) return 'FEMALE';

  return 'FEMALE';
}

function mapEthnicity(raw) {
  if (!raw) return pickRandom(ETHNICITIES);

  const value = String(raw).toLowerCase();

  if (value.includes('europe')) return 'EUROPEAN';
  if (value.includes('asian') || value.includes('asia')) return 'ASIAN';
  if (value.includes('latin')) return 'LATIN';
  if (value.includes('middle')) return 'MIDDLE_EASTERN';
  if (value.includes('mixed')) return 'MIXED';
  if (value.includes('other')) return 'OTHER';

  return pickRandom(ETHNICITIES);
}

function mapLanguages(raw) {
  if (!raw) return [pickRandom(LANGUAGES)];

  const value = String(raw).toLowerCase();
  const langs = new Set();

  if (value.includes('english') || value.includes('ინგლის')) langs.add('EN');
  if (value.includes('ქართული') || value.includes('georgian') || value.includes('kartuli')) langs.add('KA');
  if (value.includes('russian') || value.includes('рус') || value.includes('ру') || value.includes('russ')) langs.add('RU');
  if (value.includes('spanish') || value.includes('español') || value.includes('espanol')) langs.add('ES');
  if (value.includes('french') || value.includes('français') || value.includes('francais')) langs.add('FR');

  const result = Array.from(langs);
  return result.length ? result : [pickRandom(LANGUAGES)];
}

function randomServices() {
  return pickRandomSubset(SERVICES, 1, SERVICES.length);
}

async function ensureUniquePhone(client, phoneNumber) {
  let candidate = phoneNumber;

  while (true) {
    const exists = await client.query(
      `SELECT "id" FROM "escort_profiles" WHERE "phoneNumber" = $1 LIMIT 1`,
      [candidate]
    );

    if (!exists.rows.length) return candidate;
    candidate = randomPhone();
  }
}

async function ensureUniqueUsername(client, username) {
  let candidate = username;

  while (true) {
    const exists = await client.query(
      `SELECT "id" FROM "escort_profiles" WHERE "username" = $1 LIMIT 1`,
      [candidate]
    );

    if (!exists.rows.length) return candidate;
    candidate = `${username}_${randomInt(100, 99999)}`;
  }
}

async function run() {
  const raw = fs.readFileSync('./models.json', 'utf8');
  const models = JSON.parse(raw);

  if (!Array.isArray(models)) {
    throw new Error('./models.json უნდა იყოს array');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const item of models) {
      let phoneNumber = item['ტელეფონი']
        ? String(item['ტელეფონი']).trim()
        : randomPhone();

      if (!phoneNumber) {
        phoneNumber = randomPhone();
      }

      const rawName = normalizeString(item['სახელი'], 'Unknown Model');
      const city = normalizeString(item['ქალაქი'], 'Tbilisi');
      const address = normalizeString(
        item['მისამართი'] || item['ქალაქი'] || item['ქვეყანა'],
        city
      );

      const height = extractNumber(item['სიმაღლე']) ?? randomInt(155, 185);
      const weight = extractNumber(item['წონა']) ?? randomInt(48, 80);
      const age = extractNumber(item['გოგო']) ?? randomInt(21, 35);
      const gender = mapGender(item['სქესი'] || item['სახელი']);
      const ethnicity = mapEthnicity(item['ეროვნება']);
      const languages = mapLanguages(item['ენები']);
      const services = randomServices();
      const viewCount = randomInt(0, 2500);
      const isVerified = randomBool(0.35);
      const vipUntil = randomBool(0.3)
        ? new Date(Date.now() + randomInt(7, 60) * 24 * 60 * 60 * 1000)
        : null;

      let username =
        item['username'] ||
        item['იუზერნეიმი'] ||
        slugifyUsername(rawName) ||
        phoneNumber;

      username = username || randomUsername(rawName);

      const existingByPhone = await client.query(
        `SELECT "id" FROM "escort_profiles" WHERE "phoneNumber" = $1 LIMIT 1`,
        [phoneNumber]
      );

      if (!existingByPhone.rows.length) {
        phoneNumber = await ensureUniquePhone(client, phoneNumber);
        username = await ensureUniqueUsername(client, username);
      }

      const upsertSql = `
        INSERT INTO "escort_profiles" (
          "phoneNumber",
          "username",
          "city",
          "address",
          "services",
          "height",
          "weight",
          "age",
          "ethnicity",
          "gender",
          "languages",
          "viewCount",
          "isVerified",
          "vipUntil",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          NOW(),
          NOW()
        )
        ON CONFLICT ("phoneNumber")
        DO UPDATE SET
          "username" = EXCLUDED."username",
          "city" = EXCLUDED."city",
          "address" = EXCLUDED."address",
          "services" = EXCLUDED."services",
          "height" = EXCLUDED."height",
          "weight" = EXCLUDED."weight",
          "age" = EXCLUDED."age",
          "ethnicity" = EXCLUDED."ethnicity",
          "gender" = EXCLUDED."gender",
          "languages" = EXCLUDED."languages",
          "viewCount" = EXCLUDED."viewCount",
          "isVerified" = EXCLUDED."isVerified",
          "vipUntil" = EXCLUDED."vipUntil",
          "updatedAt" = NOW()
        RETURNING "id"
      `;

      const profileRes = await client.query(upsertSql, [
        phoneNumber,
        username,
        city,
        address,
        services,
        height,
        weight,
        age,
        ethnicity,
        gender,
        languages,
        viewCount,
        isVerified,
        vipUntil,
      ]);

      const profileId = profileRes.rows[0].id;
      const pictures = Array.isArray(item['სურათები']) ? item['სურათები'] : [];

      await client.query(
        `DELETE FROM "escort_pictures" WHERE "profileId" = $1`,
        [profileId]
      );

      for (let i = 0; i < pictures.length; i++) {
        const picturePath = String(pictures[i] || '').trim();
        if (!picturePath) continue;

        await client.query(
          `
          INSERT INTO "escort_pictures" (
            "id",
            "profileId",
            "picturePath",
            "isProfilePicture",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          `,
          [crypto.randomUUID(), profileId, picturePath, i === 0]
        );
      }

      console.log(`Imported: ${phoneNumber} -> ${username}`);
    }

    await client.query('COMMIT');
    console.log('DONE');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});