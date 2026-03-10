import { Bot, InlineKeyboard, InputFile } from "grammy";
import { getCities, getEscortsByCity, getEscortProfile, searchEscorts } from "./db.js";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { existsSync, createReadStream, readdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

let BOT_TOKEN = (process.env.BOT_TOKEN || "").trim().replace(/\r$/g, "");
if (BOT_TOKEN.startsWith('"') && BOT_TOKEN.endsWith('"')) BOT_TOKEN = BOT_TOKEN.slice(1, -1).trim();
if (BOT_TOKEN.startsWith("'") && BOT_TOKEN.endsWith("'")) BOT_TOKEN = BOT_TOKEN.slice(1, -1).trim();
if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required. Set it in the project root .env (or telegram-bot/.env for local run).");
  process.exit(1);
}

const SITE_URL = process.env.SITE_URL || "https://elitescort.fun";
const API_BASE_URL = process.env.API_BASE_URL || "https://api.elitescort.fun";
const UPLOADS_DIR =
  process.env.UPLOADS_DIR ||
  resolve(__dirname, "..", "..", "escort-backend", "uploads");

const bot = new Bot(BOT_TOKEN);

// ── Main menu ──────────────────────────────────────────────

function mainMenuKeyboard() {
  return new InlineKeyboard()
    .text("💃 Escorts", "menu:escorts")
    .row()
    .text("🔍 Search", "menu:search")
    .row()
    .url("🌐 Open Website", SITE_URL);
}

bot.command("start", async (ctx) => {
  await ctx.reply(
    "✨ <b>Welcome to ELITEFUN</b>\n\nBrowse escort profiles or visit our website.",
    { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
  );
});

bot.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await safeEdit(ctx,
    "✨ <b>Welcome to ELITEFUN</b>\n\nBrowse escort profiles or visit our website.",
    mainMenuKeyboard()
  );
});

// ── City selection ─────────────────────────────────────────

const CITY_EMOJI = {
  tbilisi: "🏙",
  batumi: "🌊",
  kutaisi: "⛰",
  rustavi: "🏭",
  saburtalo: "🏘",
  other: "📌",
};

function cityLabel(city) {
  const lower = (city || "").toLowerCase();
  const emoji = CITY_EMOJI[lower] || "📍";
  const name = city.charAt(0).toUpperCase() + city.slice(1);
  return `${emoji} ${name}`;
}

bot.callbackQuery("menu:escorts", async (ctx) => {
  await ctx.answerCallbackQuery();
  const cities = await getCities();
  if (!cities.length) {
    return safeEdit(ctx, "No cities found.", new InlineKeyboard().text("« Back", "menu:main"));
  }

  const kb = new InlineKeyboard();
  for (let i = 0; i < cities.length; i++) {
    const { city, count } = cities[i];
    kb.text(`${cityLabel(city)} (${count})`, `city:${city}:0`);
    if (i % 2 === 1) kb.row();
  }
  if (cities.length % 2 === 1) kb.row();
  kb.text("« Back", "menu:main");

  await safeEdit(ctx, "🏙 <b>Choose a city:</b>", kb);
});

// ── Escort list (paginated) ────────────────────────────────

function escortButtonLabel(e) {
  const parts = [e.username];
  if (e.age) parts.push(`${e.age}y`);
  if (e.ethnicity) parts.push(e.ethnicity);
  return parts.join(" · ");
}

bot.callbackQuery(/^city:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const city = ctx.match[1];
  const page = parseInt(ctx.match[2], 10);
  const { items, hasMore } = await getEscortsByCity(city, page);

  if (!items.length) {
    return safeEdit(ctx,
      `No escorts found in <b>${escapeHtml(city)}</b>.`,
      new InlineKeyboard().text("« Cities", "menu:escorts").text("« Home", "menu:main")
    );
  }

  const lines = items.map(
    (e, i) =>
      `<b>${page * 10 + i + 1}.</b> ${escapeHtml(e.username)}` +
      `${e.age ? ` · ${e.age}y` : ""}` +
      `${e.ethnicity ? ` · ${e.ethnicity}` : ""}`
  );

  const text =
    `💃 <b>Escorts in ${cityLabel(city)}</b>  (page ${page + 1})\n\n` +
    lines.join("\n");

  const kb = new InlineKeyboard();
  for (const e of items) {
    kb.text(escortButtonLabel(e), `escort:${e.id}:${city}`).row();
  }

  if (page > 0 || hasMore) {
    if (page > 0) kb.text("⬅️ Prev", `city:${city}:${page - 1}`);
    if (hasMore) kb.text("Next ➡️", `city:${city}:${page + 1}`);
    kb.row();
  }
  kb.text("« Cities", "menu:escorts").text("« Home", "menu:main");

  await safeEdit(ctx, text, kb);
});

// ── Single escort profile ──────────────────────────────────

bot.callbackQuery(/^escort:([^:]+):?(.*)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  const fromCity = ctx.match[2] || null;
  const escort = await getEscortProfile(id);

  if (!escort) {
    return safeEdit(ctx, "Profile not found.",
      new InlineKeyboard().text("« Back", "menu:escorts")
    );
  }

  const profileUrl = `${SITE_URL}/escort/${id}`;
  const caption = buildCaption(escort);

  const kb = new InlineKeyboard();
  if (escort.phoneNumber) {
    const digits = escort.phoneNumber.replace(/\D/g, "");
    const waNum = digits.startsWith("995") ? digits : `995${digits.slice(-9)}`;
    kb.url(
      "💬 WhatsApp",
      `https://wa.me/${waNum}?text=${encodeURIComponent("Hello, I found your profile on elitescort.fun")}`
    ).row();
  }
  kb.url("🔗 View Full Profile", profileUrl).row();

  const backCity = fromCity || escort.city;
  kb.text(`« Back to ${cityLabel(backCity)}`, `city:${backCity}:0`);
  kb.text("« Home", "menu:main");

  const sent = await trySendPhoto(ctx, escort.profilePicture, escort.username, caption, kb);
  if (!sent) {
    await safeEdit(ctx, caption, kb);
  }
});

function buildCaption(escort) {
  return [
    `<b>${escapeHtml(escort.username)}</b>`,
    "",
    escort.age ? `🎂 Age: ${escort.age}` : null,
    escort.ethnicity ? `🌍 Ethnicity: ${escort.ethnicity}` : null,
    escort.gender ? `⚧ Gender: ${escort.gender}` : null,
    escort.city ? `📍 City: ${escort.city}` : null,
    escort.height ? `📏 Height: ${escort.height} cm` : null,
    escort.weight ? `⚖️ Weight: ${escort.weight} kg` : null,
    escort.phoneNumber ? `📞 Phone: <code>${escapeHtml(escort.phoneNumber)}</code>` : null,
    "",
    escort.bio
      ? escapeHtml(escort.bio.slice(0, 300)) + (escort.bio.length > 300 ? "…" : "")
      : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

// ── Search ─────────────────────────────────────────────────

const sessions = new Map();

bot.callbackQuery("menu:search", async (ctx) => {
  await ctx.answerCallbackQuery();
  sessions.set(ctx.from.id, { awaitingSearch: true });
  await safeEdit(ctx,
    "🔍 <b>Search</b>\n\nType a name to search for an escort:",
    new InlineKeyboard().text("« Back", "menu:main")
  );
});

bot.on("message:text", async (ctx) => {
  const session = sessions.get(ctx.from.id);
  if (!session?.awaitingSearch) return;
  sessions.delete(ctx.from.id);

  const term = ctx.message.text.trim();
  if (!term) return;

  const { items } = await searchEscorts(term, 0);
  if (!items.length) {
    return ctx.reply(`No results for "<b>${escapeHtml(term)}</b>".`, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("🔍 Try Again", "menu:search")
        .text("« Home", "menu:main"),
    });
  }

  const lines = items.map(
    (e, i) =>
      `<b>${i + 1}.</b> ${escapeHtml(e.username)}` +
      `${e.age ? ` · ${e.age}y` : ""}` +
      `${e.city ? ` · ${e.city}` : ""}`
  );

  const kb = new InlineKeyboard();
  for (const e of items) {
    kb.text(escortButtonLabel(e), `escort:${e.id}`).row();
  }
  kb.text("🔍 New Search", "menu:search").text("« Home", "menu:main");

  await ctx.reply(
    `🔍 Results for "<b>${escapeHtml(term)}</b>":\n\n${lines.join("\n")}`,
    { parse_mode: "HTML", reply_markup: kb }
  );
});

// ── Image helpers ──────────────────────────────────────────

let _imageDirs = null;
function getImageDirs() {
  if (!_imageDirs) {
    const imagesRoot = resolve(UPLOADS_DIR, "images");
    try {
      _imageDirs = readdirSync(imagesRoot);
    } catch {
      _imageDirs = [];
    }
  }
  return _imageDirs;
}

function resolveImagePath(picturePath, username) {
  if (!picturePath) return null;
  const relative = picturePath.replace(/^\/?uploads\//, "");
  const full = resolve(UPLOADS_DIR, relative);
  if (existsSync(full)) return full;

  const parts = relative.split("/");
  if (parts.length >= 2 && parts[0] === "images") {
    const dbFolder = parts[1];
    const fileName = parts.slice(2).join("/") || "image-1.jpg";

    const stripped = dbFolder
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]/gu, "")
      .replace(/^-+|-+$/g, "");
    const nameMatch = stripped.match(/^(.+?)[-–]TOP/i);
    const rawPrefix = nameMatch ? nameMatch[1] : stripped.split("-")[0];
    const prefix = rawPrefix.toLowerCase().replace(/-+$/, "");

    const dirs = getImageDirs();
    const norm = (s) =>
      s
        .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]/gu, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

    const shortPrefix = prefix.split("-")[0];
    const uname = (username || "").toLowerCase();

    const match =
      dirs.find((d) => d === dbFolder) ||
      dirs.find((d) => norm(d).startsWith(prefix + "-top")) ||
      dirs.find((d) => norm(d).startsWith(prefix + "-")) ||
      dirs.find((d) => norm(d) === prefix || norm(d).startsWith(prefix)) ||
      dirs.find((d) => norm(d).startsWith(shortPrefix + "-top")) ||
      dirs.find((d) => norm(d).startsWith(shortPrefix + "-")) ||
      (uname && dirs.find((d) => norm(d).startsWith(uname + "-"))) ||
      (uname && dirs.find((d) => norm(d).startsWith(uname)));

    if (match) {
      const candidate = resolve(UPLOADS_DIR, "images", match, fileName);
      if (existsSync(candidate)) return candidate;
      const fallback = resolve(UPLOADS_DIR, "images", match, "image-1.jpg");
      if (existsSync(fallback)) return fallback;
    }
  }

  return null;
}

async function trySendPhoto(ctx, picturePath, username, caption, kb) {
  const localPath = resolveImagePath(picturePath, username);
  if (localPath) {
    try {
      await ctx.deleteMessage().catch(() => {});
      await ctx.replyWithPhoto(new InputFile(localPath), {
        caption,
        parse_mode: "HTML",
        reply_markup: kb,
      });
      return true;
    } catch (err) {
      console.warn("Local photo failed:", localPath, err.message);
    }
  } else {
    console.warn("Image not found on disk:", picturePath);
  }

  return false;
}

// ── Utilities ──────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function safeEdit(ctx, text, kb) {
  try {
    if (ctx.callbackQuery?.message?.photo) {
      await ctx.deleteMessage().catch(() => {});
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
    } else {
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
    }
  } catch {
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb }).catch(() => {});
  }
}

// ── Start ──────────────────────────────────────────────────

bot.catch((err) => {
  console.error("Bot error:", err.message);
});

async function startWithRetry(maxRetries = 5) {
  // Wait for any previous polling session to release the token (only one process can use it)
  const initialDelay = 15;
  console.log(`Waiting ${initialDelay}s for any previous session to release the token...`);
  await new Promise((r) => setTimeout(r, initialDelay * 1000));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await bot.api.getMe();
      console.log("✅ Token verified, starting polling...");
      await bot.start({
        onStart: () => console.log("🤖 Telegram bot is running"),
      });
      return;
    } catch (err) {
      const is409 = err.error_code === 409;
      const is404 = err.error_code === 404;
      if ((is409 || is404) && attempt < maxRetries) {
        const delay = attempt * 10;
        console.log(
          `⏳ Attempt ${attempt}/${maxRetries} failed (${err.error_code}). ` +
            `Another process may be using this token. Retrying in ${delay}s...`
        );
        await new Promise((r) => setTimeout(r, delay * 1000));
        continue;
      }
      console.error(`Failed to start bot after ${attempt} attempts:`, err.message);
      if (is404 || is409) {
        console.error("");
        console.error("→ 404/409 usually means ANOTHER INSTANCE is already running with this BOT_TOKEN.");
        console.error("→ Stop: local 'npm start', duplicate Docker container, or the same bot on another server.");
        console.error("→ Only one process can poll a Telegram bot at a time.");
      }
      process.exit(1);
    }
  }
}

startWithRetry();
