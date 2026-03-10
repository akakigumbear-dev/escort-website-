import pg from "pg";

const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "nestuser",
  password: process.env.DB_PASS || "nestpass",
  database: process.env.DB_NAME || "nestdb",
  max: 5,
});

export async function getCities() {
  const { rows } = await pool.query(
    `SELECT city, COUNT(*)::int AS cnt
     FROM escort_profiles
     WHERE city IS NOT NULL AND city != ''
     GROUP BY city
     ORDER BY cnt DESC`
  );
  return rows.map((r) => ({ city: r.city, count: r.cnt }));
}

const PAGE_SIZE = 10;

export async function getEscortsByCity(city, page = 0) {
  const offset = page * PAGE_SIZE;
  const { rows } = await pool.query(
    `SELECT ep.id, ep.username, ep.age, ep.ethnicity, ep.city,
            ep."phoneNumber",
            (SELECT pic."picturePath"
             FROM escort_pictures pic
             WHERE pic."profileId" = ep.id
             ORDER BY pic."isProfilePicture" DESC, pic."createdAt" ASC
             LIMIT 1) AS "profilePicture"
     FROM escort_profiles ep
     WHERE LOWER(ep.city) = LOWER($1)
     ORDER BY ep."viewCount" DESC
     LIMIT $2 OFFSET $3`,
    [city, PAGE_SIZE + 1, offset]
  );

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return { items, hasMore, page };
}

export async function getEscortProfile(id) {
  const { rows } = await pool.query(
    `SELECT ep.id, ep.username, ep.age, ep.ethnicity, ep.city,
            ep."phoneNumber", ep.gender, ep.height, ep.weight,
            ep.bio, ep."viewCount"
     FROM escort_profiles ep
     WHERE ep.id = $1`,
    [id]
  );
  if (!rows.length) return null;

  const profile = rows[0];

  const pics = await pool.query(
    `SELECT "picturePath" FROM escort_pictures
     WHERE "profileId" = $1
     ORDER BY "isProfilePicture" DESC, "createdAt" ASC
     LIMIT 1`,
    [id]
  );
  profile.profilePicture = pics.rows[0]?.picturePath ?? null;
  return profile;
}

export async function searchEscorts(term, page = 0) {
  const offset = page * PAGE_SIZE;
  const pattern = `%${term}%`;
  const { rows } = await pool.query(
    `SELECT ep.id, ep.username, ep.age, ep.ethnicity, ep.city
     FROM escort_profiles ep
     WHERE ep.username ILIKE $1 OR ep."phoneNumber" ILIKE $1
     ORDER BY ep."viewCount" DESC
     LIMIT $2 OFFSET $3`,
    [pattern, PAGE_SIZE + 1, offset]
  );
  const hasMore = rows.length > PAGE_SIZE;
  return { items: hasMore ? rows.slice(0, PAGE_SIZE) : rows, hasMore, page };
}

export default pool;
