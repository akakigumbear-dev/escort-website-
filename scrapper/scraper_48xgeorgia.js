/*
Install:
npm uninstall chromedriver
npm install selenium-webdriver@latest

Run:
node scraper_48xgeorgia.js

Headless: 48xgeorgia age gate often fails in headless. Use visible browser by default.
For headless (no window), run: HEADLESS=1 node scraper_48xgeorgia.js
*/

const fs = require("fs/promises");
const path = require("path");
const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const SITE_URL = "https://48xgeorgia.me/female-escorts/";
const OUTPUT_FILE = path.join(__dirname, "models_48xgeorgia.json");
const IMAGES_DIR = path.join(__dirname, "images");

const RETRY_INTERVAL_MS = 3000;
const PAGE_LOAD_WAIT_MS = 15000;
const ELEMENT_WAIT_MS = 10000;
const PROFILE_WAIT_AFTER_OPEN_MS = 2000;
const BETWEEN_ITEMS_MS = 1200;
const BETWEEN_PAGES_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeFileName(value) {
  return (
    String(value || "")
      .normalize("NFKD")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "unknown"
  );
}

function getExtensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = path.extname(pathname);
    if (ext && ext.length <= 5) return ext;
  } catch {}
  return ".jpg";
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureJsonFile() {
  try {
    await fs.access(OUTPUT_FILE);
  } catch {
    await fs.writeFile(OUTPUT_FILE, "[]", "utf8");
  }
}

async function readJsonArray() {
  await ensureJsonFile();

  try {
    const raw = await fs.readFile(OUTPUT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read/parse JSON. Recreating file.", err.message);
    await fs.writeFile(OUTPUT_FILE, "[]", "utf8");
    return [];
  }
}

async function appendRecord(record) {
  const data = await readJsonArray();

  const exists = data.some((item) => {
    const sameUrl =
      normalizeText(item.url) &&
      normalizeText(item.url) === normalizeText(record.url);

    const samePhone =
      normalizeText(item["ტელეფონი"]) &&
      normalizeText(record["ტელეფონი"]) &&
      normalizeText(item["ტელეფონი"]) === normalizeText(record["ტელეფონი"]);

    const sameName =
      normalizeText(item["სახელი"]) &&
      normalizeText(record["სახელი"]) &&
      normalizeText(item["სახელი"]) === normalizeText(record["სახელი"]);

    return sameUrl || samePhone || sameName;
  });

  if (exists) {
    console.log(`Duplicate skipped: ${record["სახელი"] || record.url}`);
    return false;
  }

  data.push(record);
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf8");
  console.log(`Saved: ${record["სახელი"] || record.url}`);
  return true;
}

async function buildDriver() {
  const options = new chrome.Options();

  if (process.env.HEADLESS === "1") {
    options.addArguments("--headless=new");
    options.addArguments("--disable-gpu");
  } else {
    options.addArguments("--start-maximized");
  }
  options.addArguments("--window-size=1920,1080");
  options.addArguments("--disable-blink-features=AutomationControlled");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");

  return await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();
}

async function safeFindElement(driver, locator) {
  try {
    return await driver.findElement(locator);
  } catch {
    return null;
  }
}

async function waitUntilPageReady(driver, timeoutMs = PAGE_LOAD_WAIT_MS) {
  try {
    await driver.wait(
      async () => {
        const state = await driver.executeScript("return document.readyState");
        return state === "complete";
      },
      timeoutMs,
      "Document readyState did not become complete in time"
    );
  } catch {}
}

async function waitAndClickAgeGate(driver) {
  console.log("Waiting for 18+ age gate on 48xgeorgia...");

  await sleep(3000);

  const MAX_ATTEMPTS = 20;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const bySelenium = await (async () => {
        const locators = [
          By.partialLinkText("Click"),
          By.partialLinkText("დააჭირეთ"),
          By.partialLinkText("Нажмите"),
          By.xpath("//a[contains(@href,'female-escorts')]"),
          By.xpath("//a[contains(text(),'Click')]"),
          By.css("a[href*='female-escorts']"),
        ];
        for (const loc of locators) {
          try {
            const el = await driver.findElement(loc);
            if (el) {
              await el.click();
              return true;
            }
          } catch {}
        }
        return false;
      })();

      if (bySelenium) {
        console.log("Age gate clicked (Selenium locator).");
        await sleep(3000);
        await waitUntilPageReady(driver);
        const hasListing = await driver.executeScript(
          () => document.querySelectorAll('a[href*="/escort/"]').length > 2
        );
        if (hasListing) {
          console.log("Age gate passed, listing is visible.");
          return;
        }
        console.log("Clicked but listing not yet visible, retrying...");
        await sleep(RETRY_INTERVAL_MS);
        continue;
      }

      const result = await driver.executeScript(() => {
        const clean = (v) =>
          v ? String(v).replace(/\s+/g, " ").trim().toLowerCase() : "";

        const allLinks = Array.from(document.querySelectorAll("a"));

        for (const el of allLinks) {
          const text = clean(
            el.innerText || el.textContent || el.value || ""
          );
          const href = (el.getAttribute("href") || "").toLowerCase();

          if (
            text.includes("click") ||
            text.includes("დააჭირეთ") ||
            text.includes("нажмите") ||
            text.includes("enter") ||
            text.includes("შესვლა") ||
            text.includes("вход")
          ) {
            el.click();
            return { clicked: true, text };
          }

          if (
            href.includes("female-escorts") ||
            href.includes("/escort") ||
            href.includes("enter") ||
            href.includes("age")
          ) {
            el.click();
            return { clicked: true, href };
          }
        }

        const allButtons = Array.from(
          document.querySelectorAll(
            "button, input[type='button'], input[type='submit']"
          )
        );

        for (const el of allButtons) {
          const text = clean(
            el.innerText || el.textContent || el.value || ""
          );
          if (text) {
            el.click();
            return { clicked: true, text };
          }
        }

        if (allLinks.length > 0) {
          const firstWithHref = allLinks.find(
            (a) =>
              (a.getAttribute("href") || "").length > 1 &&
              !(a.getAttribute("href") || "").startsWith("javascript:")
          );
          if (firstWithHref) {
            firstWithHref.click();
            return { clicked: true, fallback: "first-link" };
          }
        }

        const allClickable = document.querySelectorAll("a, button, [onclick], [role='button']");
        for (const el of allClickable) {
          const t = clean(el.innerText || el.textContent || "");
          if (t && (t.includes("click") || t.includes("დააჭირეთ") || t.includes("нажмите"))) {
            el.click();
            return { clicked: true, fallback: "any-clickable" };
          }
        }

        const byText = document.evaluate(
          "//*[contains(text(),'Click') or contains(text(),'click') or contains(text(),'დააჭირეთ') or contains(text(),'Нажмите')]",
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        if (byText) {
          byText.click();
          return { clicked: true, fallback: "xpath-text" };
        }

        return { clicked: false };
      });

      if (result?.clicked) {
        console.log("Age gate clicked:", JSON.stringify(result));
        await sleep(3000);
        await waitUntilPageReady(driver);

        const hasListing = await driver.executeScript(() => {
          return document.querySelectorAll('a[href*="/escort/"]').length > 2;
        });

        if (hasListing) {
          console.log("Age gate passed, listing is visible.");
          return;
        }

        console.log("Clicked but listing not yet visible, retrying...");
        continue;
      }

      const pageText = await driver.executeScript(() =>
        (document.body?.innerText || "").slice(0, 500)
      );
      console.log(`Age gate attempt ${attempt + 1}: no clickable element. Page text: ${pageText.slice(0, 200)}`);
    } catch (err) {
      console.log(`Age gate attempt ${attempt + 1} error:`, err.message);
    }

    await sleep(RETRY_INTERVAL_MS);
  }

  console.log(
    "Could not auto-click age gate after max attempts. Trying direct navigation..."
  );
  await driver.get(SITE_URL);
  await waitUntilPageReady(driver);
  await sleep(3000);
}

async function waitForEscortListing(driver, maxWaitMs = 60000) {
  console.log("Waiting for escort listing (links to /escort/)...");
  console.log(
    "If captcha or protection appears, solve it manually in the browser."
  );

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const info = await driver.executeScript(() => {
        const allAnchors = document.querySelectorAll("a");
        const escortAnchors = document.querySelectorAll(
          'a[href*="/escort/"]'
        );
        const withImg = Array.from(escortAnchors).filter((a) =>
          a.querySelector("img")
        );
        const girls = document.querySelectorAll(".girl, div.girl");

        return {
          totalLinks: allAnchors.length,
          escortLinks: escortAnchors.length,
          withImg: withImg.length,
          girlDivs: girls.length,
          bodyLen: (document.body?.innerHTML || "").length,
        };
      });

      console.log(
        `  Listing check: ${info.escortLinks} escort links, ${info.withImg} with images, ${info.girlDivs} .girl divs, ${info.totalLinks} total links, body ${info.bodyLen} chars`
      );

      if (info.withImg > 0 || info.girlDivs > 0 || info.escortLinks > 3) {
        console.log("Escort listing detected.");
        return;
      }
    } catch (err) {
      console.log("Still waiting for escort listing:", err.message);
    }

    await sleep(RETRY_INTERVAL_MS);
  }

  console.log("WARNING: escort listing not detected within timeout, proceeding anyway.");
}

async function collectModelLinks(driver) {
  console.log("Collecting model links from current 48xgeorgia page...");

  try {
    const links = await driver.executeScript(() => {
      const set = new Set();

      const girlDivs = document.querySelectorAll(
        "div.girl, div[itemtype*='Person']"
      );
      for (const div of girlDivs) {
        const a = div.querySelector("a[href*='/escort/']");
        if (a) {
          try {
            const url = new URL(a.href || a.getAttribute("href"), window.location.href);
            set.add(url.href.split("#")[0]);
          } catch {}
        }
      }

      const anchors = document.querySelectorAll('a[href*="/escort/"]');
      for (const a of anchors) {
        const href = a.href || a.getAttribute("href");
        if (!href) continue;

        const parent = a.closest(".girl, .thumb, .thumbwrapper, .girlpremium");
        const hasImage = !!a.querySelector("img") || !!parent;

        if (!hasImage) continue;

        try {
          const url = new URL(href, window.location.href);
          if (!url.pathname.includes("/escort/")) continue;
          set.add(url.href.split("#")[0]);
        } catch {}
      }

      return Array.from(set);
    });

    console.log(`Collected ${links.length} model links on this page`);
    return links;
  } catch (err) {
    console.error("Failed to collect model links:", err.message);
    return [];
  }
}

async function switchToNewTab(driver, url) {
  const originalHandles = await driver.getAllWindowHandles();

  await driver.executeScript("window.open(arguments[0], '_blank');", url);

  await driver.wait(async () => {
    const handles = await driver.getAllWindowHandles();
    return handles.length > originalHandles.length;
  }, ELEMENT_WAIT_MS);

  const newHandles = await driver.getAllWindowHandles();
  const newTabHandle = newHandles.find((h) => !originalHandles.includes(h));

  if (!newTabHandle) {
    throw new Error("Failed to detect new tab handle");
  }

  await driver.switchTo().window(newTabHandle);
  await waitUntilPageReady(driver);

  return newTabHandle;
}

async function closeCurrentTabAndReturn(driver, mainHandle) {
  try {
    await driver.close();
  } finally {
    await driver.switchTo().window(mainHandle);
  }
}

async function extractEscortProfile(driver) {
  return await driver.executeScript(() => {
    const clean = (value) =>
      value ? String(value).replace(/\s+/g, " ").trim() : "";

    const getName = () => {
      const selectors = [
        ".profile-header-name h1",
        ".profile-header-name",
        "h1[itemprop='name']",
        "[itemprop='name']",
        ".profile-header h1",
        "h1",
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const t = clean(el.textContent);
          if (t) return t;
        }
      }

      const titleTag = document.querySelector("title");
      if (titleTag) {
        return clean(
          titleTag.textContent
            .replace(/48xgeorgia/gi, "")
            .replace(/\|/g, "")
            .replace(/escort/gi, "")
        );
      }

      return "";
    };

    const getPhone = () => {
      const selCandidates = [
        "a[itemprop='telephone']",
        "a[href^='tel:']",
        ".phone-box a[href^='tel:']",
        ".telephone a",
      ];

      for (const sel of selCandidates) {
        const el = document.querySelector(sel);
        if (!el) continue;

        const href = el.getAttribute("href") || "";
        if (href.startsWith("tel:")) {
          const num = clean(href.slice(4));
          if (num) return num;
        }

        const text = clean(el.innerText || el.textContent || "");
        if (text) return text;
      }

      return "";
    };

    const getHeightWeightAge = () => {
      const infoEl = document.querySelector(".profile-header-name-info");
      if (!infoEl) return { height: null, weight: null, age: null };

      const text = clean(infoEl.textContent);
      if (!text) return { height: null, weight: null, age: null };

      let height = null;
      let weight = null;
      let age = null;

      const heightMatch = text.match(/(\d{2,3})\s*cm/i) || text.match(/(\d{2,3})cm/i);
      if (heightMatch) height = Number(heightMatch[1]);

      const weightMatch = text.match(/(\d{2,3})\s*kg/i) || text.match(/(\d{2,3})kg/i);
      if (weightMatch) weight = Number(weightMatch[1]);

      const ageMatch =
        text.match(/(\d{2})\s*წლის/i) ||
        text.match(/(\d{2})წლის/i) ||
        text.match(/(\d{1,2})\s*лет/i) ||
        text.match(/(\d{1,2})\s*years?/i) ||
        text.match(/\b(18|19|2[0-9]|3[0-5])\b/);
      if (ageMatch) age = Number(ageMatch[1]);

      return { height, weight, age };
    };

    const getAgeFromDescription = (desc) => {
      if (!desc) return null;
      const m = desc.match(/(\d{1,2})\s*წლის\s*გოგო/i) || desc.match(/(\d{1,2})\s*წლის/i);
      return m ? Number(m[1]) : null;
    };

    const getLocationFromDescription = (desc) => {
      let city = "";
      let address = "";

      const georgianCities = [
        "თბილისი", "ბათუმი", "ქუთაისი", "რუსთავი",
        "ზუგდიდი", "გორი", "ქობულეთი",
      ];
      const englishCities = [
        "tbilisi", "batumi", "kutaisi", "rustavi",
        "zugdidi", "gori", "kobuleti",
      ];

      const match = desc.match(/:\s*([^,]+),\s*([^\n.,]+?)(?:\s|$)/);
      if (match) {
        address = clean(match[1]);
        city = clean(match[2]);
      }

      if (!city && desc) {
        const lower = desc.toLowerCase();
        for (const c of georgianCities) {
          if (lower.includes(c.toLowerCase())) {
            city = c;
            break;
          }
        }
        if (!city) {
          for (const c of englishCities) {
            if (lower.includes(c)) {
              city = c.charAt(0).toUpperCase() + c.slice(1);
              break;
            }
          }
        }
      }

      return { city, address };
    };

    const getDescription = () => {
      const aboutEl = document.querySelector(".aboutme");
      if (aboutEl) return clean(aboutEl.textContent);

      const descEl = document.querySelector(
        "[itemprop='description'], .description, .profile-description"
      );
      if (descEl) return clean(descEl.textContent);

      return "";
    };

    const getBadge = () => {
      const badgeEl = document.querySelector(
        ".profile-header-name .premiumlabel, .vip-badge, .badge, [class*='vip'], [class*='elite']"
      );
      if (badgeEl) return clean(badgeEl.textContent);

      const headerText = (
        document.querySelector(".profile-header-name")?.textContent || ""
      );
      const m = headerText.match(/(?:VIP\s*ELITE|VIP|TOP|PREMIUM)/i);
      return m ? m[0] : "";
    };

    const getContactInfo = () => {
      let district = "";
      let city = "";
      const nodes = document.querySelectorAll(
        ".profile-params div, .profile-info-container div, .girlInfo div, [class*='contact'] div"
      );

      for (const node of nodes) {
        const text = clean(node.innerText || "");
        if (text.includes("უბანი") || text.includes("district")) {
          const val = (text.split(/[:：]/)[1] || "").trim();
          if (val) district = clean(val);
        }
        if (text.includes("ქალაქი") || text.includes("city")) {
          const val = (text.split(/[:：]/)[1] || "").trim();
          if (val) city = clean(val);
        }
      }
      return { district, city };
    };

    const getParams = () => {
      const params = {};
      const bodyText = document.body?.innerText || "";

      const rows = document.querySelectorAll(
        ".profile-params div, .girlInfo div, .profile-body div, table tr"
      );
      for (const row of rows) {
        const text = clean(row.textContent);
        if (text.includes("ეროვნება")) {
          const m = text.match(/ეროვნება[:\s]*([^\s\n,]+)/);
          if (m) params.ethnicity = clean(m[1]);
        }
        if (text.includes("ქერამკერდის") || text.includes("breast")) {
          const m = text.match(/ზომა[:\s]*([^\s\n]+)|([A-D]\d?)/i);
          if (m) params.breastSize = clean(m[1] || m[2] || m[0]);
        }
        if (text.includes("ტანი") && !text.includes("საკონტაქტო")) {
          const m = text.match(/ტანი[:\s]*([^\s\n,]+)/);
          if (m) params.bodyType = clean(m[1]);
        }
        if (text.includes("შეხვედრა") || text.includes("ბინაში") || text.includes("გამოძახებით")) {
          params.incall = bodyText.includes("ბინაში") || bodyText.includes("incall");
          params.outcall = bodyText.includes("გამოძახებით") || bodyText.includes("outcall");
        }
      }

      return params;
    };

    const getServices = () => {
      const services = [];
      const section = Array.from(document.querySelectorAll("h4, .section-title")).find(
        (el) =>
          (el.textContent || "").includes("მომსახურება") ||
          (el.textContent || "").includes("Services")
      );
      if (!section) {
        const girlInfo = document.querySelector(".girlInfo");
        if (girlInfo) {
          const items = girlInfo.querySelectorAll("li, .service-item, span.check");
          return Array.from(items)
            .map((el) => clean(el.textContent))
            .filter((t) => t && t.length > 2);
        }
        return [];
      }

      let el = section.nextElementSibling;
      for (let i = 0; i < 50 && el; i++) {
        const items = el.querySelectorAll("li, span, div");
        for (const item of items) {
          const t = clean(item.textContent);
          if (t && t.length > 2 && !t.includes("მომსახურება")) {
            services.push(t);
          }
        }
        if (services.length > 0) break;
        el = el.nextElementSibling;
      }

      if (services.length === 0) {
        const all = document.querySelectorAll(".girlInfo li, .girlInfo span");
        return Array.from(all)
          .map((e) => clean(e.textContent))
          .filter((t) => t && t.length > 2);
      }
      return services;
    };

    const getPricing = () => {
      const incall = {};
      const outcall = {};
      const rows = document.querySelectorAll(
        ".pricing tr, .prices tr, table tr, .girlInfo table tr"
      );

      for (const row of rows) {
        const cells = row.querySelectorAll("td, th");
        if (cells.length >= 2) {
          const label = clean(cells[0].textContent);
          if (!label || /\d+\s*LARI/i.test(label)) continue;

          const incVal = clean(cells[1]?.textContent || "");
          const outVal = cells.length >= 3 ? clean(cells[2]?.textContent || "") : "";

          if (incVal && /LARI/i.test(incVal)) incall[label] = incVal;
          if (outVal && /LARI/i.test(outVal)) outcall[label] = outVal;
        }
      }

      return { incall, outcall };
    };

    const getStats = () => {
      const body = document.body?.innerText || "";
      const viewMatch = body.match(/(\d+)\s*times\s*viewed|პროფილი\s*(\d+)\s*ჯერ/i);
      const perDayMatch = body.match(/(\d+)\s*times\s*(?:a\s*)?day|(\d+)\s*ჯერ\s*დღეში/i);

      return {
        viewCount: viewMatch ? Number(viewMatch[1] || viewMatch[2]) : null,
        viewsPerDay: perDayMatch ? Number(perDayMatch[1] || perDayMatch[2]) : null,
      };
    };

    const getImages = () => {
      const urls = new Set();

      const imgs = Array.from(
        document.querySelectorAll(
          ".thumbs img, img.mobile-ready-img, .profile-gallery img, .girlinside img, .girlsingle img"
        )
      );

      for (const img of imgs) {
        const candidates = [
          img.getAttribute("data-responsive-image-url"),
          img.getAttribute("data-src"),
          img.getAttribute("data-lazy"),
          img.getAttribute("src"),
        ].filter(Boolean);

        for (const c of candidates) {
          if (c.includes("placeholder") || c.includes("data:image")) continue;
          try {
            urls.add(new URL(c, window.location.href).href);
          } catch {}
        }
      }

      const anchors = Array.from(
        document.querySelectorAll(
          ".thumbs a[href*='/uploads/'], .thumbs a[href*='/wp-content/'], a[href*='/uploads/'][data-fancybox], a[href*='/wp-content/'][data-fancybox]"
        )
      );

      for (const a of anchors) {
        const href = a.getAttribute("href");
        if (href) {
          try {
            urls.add(new URL(href, window.location.href).href);
          } catch {}
        }
      }

      return Array.from(urls).filter(
        (u) => /\.(jpe?g|png|webp|gif)/i.test(u)
      );
    };

    const name = getName();
    const phone = getPhone();
    const description = getDescription();
    const { height, weight, age: ageFromHeader } = getHeightWeightAge();
    const ageFromDesc = getAgeFromDescription(description);
    const age = ageFromHeader ?? ageFromDesc;
    const { city: cityFromDesc, address } = getLocationFromDescription(description);
    const { district, city: contactCity } = getContactInfo();
    const city = contactCity || cityFromDesc;
    const badge = getBadge();
    const params = getParams();
    const services = getServices();
    const pricing = getPricing();
    const stats = getStats();
    const images = getImages();

    return {
      name,
      phone,
      city,
      address: address || district,
      country: "Georgia",
      height,
      weight,
      age,
      description,
      badge,
      ethnicity: params.ethnicity || "",
      breastSize: params.breastSize || "",
      bodyType: params.bodyType || "",
      incall: params.incall,
      outcall: params.outcall,
      services,
      pricingIncall: pricing.incall,
      pricingOutcall: pricing.outcall,
      viewCount: stats.viewCount,
      viewsPerDay: stats.viewsPerDay,
      pictures: images,

      "სახელი": name,
      "ტელეფონი": phone,
      "ქალაქი": city,
      "მისამართი": address || district,
      "ქვეყანა": "Georgia",
      "სიმაღლე": height,
      "წონა": weight,
      "გოგო": age,
      "აღწერა": description,
      "სერვისები": services,
      "სურათები": images,
      "ფასები": { ...pricing.incall, ...Object.fromEntries(
        Object.entries(pricing.outcall || {}).map(([k, v]) => [`${k} (outcall)`, v])
      ) },
    };
  });
}

async function saveImageFromBrowserContext(driver, imageUrl, folderName, index) {
  await ensureDir(IMAGES_DIR);

  const safeFolderName = sanitizeFileName(folderName);
  const targetDir = path.join(IMAGES_DIR, safeFolderName);
  await ensureDir(targetDir);

  const ext = getExtensionFromUrl(imageUrl);
  const fileName = `image-${index}${ext}`;
  const absolutePath = path.join(targetDir, fileName);

  try {
    const result = await driver.executeScript(async (targetUrl) => {
      try {
        const response = await fetch(targetUrl, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          return { ok: false, error: `HTTP ${response.status}` };
        }

        const blob = await response.blob();

        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onloadend = () => {
            const res = String(reader.result || "");
            const idx = res.indexOf(",");
            resolve(idx >= 0 ? res.slice(idx + 1) : res);
          };

          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        return { ok: true, base64 };
      } catch (err) {
        return {
          ok: false,
          error: err && err.message ? err.message : String(err),
        };
      }
    }, imageUrl);

    if (!result?.ok || !result?.base64) {
      throw new Error(result?.error || "Unknown browser fetch error");
    }

    await fs.writeFile(absolutePath, Buffer.from(result.base64, "base64"));
    return path.relative(__dirname, absolutePath);
  } catch (err) {
    console.log(`Failed to save image: ${imageUrl} -> ${err.message}`);
    return null;
  }
}

async function downloadProfileImages(driver, profile, imageUrls) {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    return [];
  }

  const folderName =
    profile.name ||
    profile["სახელი"] ||
    profile["ტელეფონი"] ||
    profile.url ||
    `profile-${Date.now()}`;

  const savedPaths = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    if (!imageUrl) continue;

    const savedPath = await saveImageFromBrowserContext(
      driver,
      imageUrl,
      folderName,
      i + 1
    );

    if (savedPath) {
      savedPaths.push(savedPath);
    }
  }

  return savedPaths;
}

async function processSingleModel(driver, mainHandle, url, index, total) {
  console.log(`[${index}/${total}] Opening: ${url}`);

  let openedNewTab = false;

  try {
    await switchToNewTab(driver, url);
    openedNewTab = true;

    await sleep(PROFILE_WAIT_AFTER_OPEN_MS);

    const profile = await extractEscortProfile(driver);

    const localImages = await downloadProfileImages(
      driver,
      { ...profile, url },
      profile["სურათები"]
    );

    const finalRecord = {
      ...profile,
      pictures: localImages,
      "სურათები": localImages,
      url,
      scrapedAt: new Date().toISOString(),
      source: "48xgeorgia",
    };

    await appendRecord(finalRecord);

    console.log(
      `[${index}/${total}] Done: ${finalRecord.name || finalRecord["სახელი"] || "Unknown"}`
    );
  } catch (err) {
    console.error(`[${index}/${total}] Failed: ${url}`);
    console.error(err.message);
  } finally {
    if (openedNewTab) {
      try {
        await closeCurrentTabAndReturn(driver, mainHandle);
      } catch (err) {
        console.error("Failed to close tab / switch back:", err.message);

        const handles = await driver.getAllWindowHandles().catch(() => []);
        if (handles.includes(mainHandle)) {
          await driver.switchTo().window(mainHandle).catch(() => {});
        }
      }
    }
  }
}

async function getCurrentPageKey(driver) {
  try {
    return await driver.getCurrentUrl();
  } catch {
    return `page-${Date.now()}`;
  }
}

async function findNextPageElement(driver) {
  const candidateSelectors = [
    'a[rel="next"]',
    ".pagination a.next",
    ".pagination .next a",
    ".pagination li.next a",
    ".pager a.next",
    'a[aria-label="Next"]',
  ];

  for (const selector of candidateSelectors) {
    try {
      const el = await safeFindElement(driver, By.css(selector));
      if (el) {
        const displayed = await el.isDisplayed().catch(() => true);
        if (displayed) return el;
      }
    } catch {}
  }

  const links = await driver.findElements(By.css("a"));

  for (const link of links) {
    try {
      const text = (await link.getText()).trim().toLowerCase();
      const href = await link.getAttribute("href");
      const cls = ((await link.getAttribute("class")) || "").toLowerCase();

      if (
        text === "next" ||
        text === ">" ||
        text === "»" ||
        text.includes("შემდეგ") ||
        cls.includes("next")
      ) {
        const displayed = await link.isDisplayed().catch(() => true);
        if (displayed && href) return link;
      }
    } catch {}
  }

  return null;
}

async function goToNextPage(driver, previousPageKey) {
  const nextEl = await findNextPageElement(driver);
  if (!nextEl) return false;

  console.log("Trying to open next page...");

  let nextHref = "";
  try {
    nextHref = await nextEl.getAttribute("href");
  } catch {}

  try {
    await driver.executeScript(
      "arguments[0].scrollIntoView({block:'center'});",
      nextEl
    );
    await sleep(500);
    await driver.executeScript("arguments[0].click();", nextEl);
  } catch (err) {
    console.log("Next page click failed, trying direct navigation:", err.message);

    if (nextHref) {
      await driver.get(nextHref);
    } else {
      return false;
    }
  }

  await waitUntilPageReady(driver);
  await sleep(BETWEEN_PAGES_MS);

  let currentPageKey = await getCurrentPageKey(driver);

  if (currentPageKey === previousPageKey && nextHref) {
    await driver.get(nextHref);
    await waitUntilPageReady(driver);
    await sleep(BETWEEN_PAGES_MS);
    currentPageKey = await getCurrentPageKey(driver);
  }

  await waitForEscortListing(driver);

  if (currentPageKey === previousPageKey) {
    console.log("Next page did not change.");
    return false;
  }

  console.log("Moved to next page:", currentPageKey);
  return true;
}

async function main() {
  const driver = await buildDriver();

  try {
    console.log("Opening 48xgeorgia site...");
    await driver.get(SITE_URL);
    await waitUntilPageReady(driver);

    await waitAndClickAgeGate(driver);
    await waitForEscortListing(driver);

    const mainHandle = await driver.getWindowHandle();

    const processedPageKeys = new Set();
    const processedModelUrls = new Set();

    while (true) {
      const pageKey = await getCurrentPageKey(driver);

      if (processedPageKeys.has(pageKey)) {
        console.log(
          "This page was already processed. Stopping pagination loop."
        );
        break;
      }

      processedPageKeys.add(pageKey);

      console.log(`\nProcessing page: ${pageKey}\n`);
      await sleep(1500);

      const modelLinks = await collectModelLinks(driver);
      const newLinks = modelLinks.filter((url) => !processedModelUrls.has(url));

      if (newLinks.length === 0) {
        console.log("No new model links found on this page.");
      }

      for (let i = 0; i < newLinks.length; i++) {
        const url = newLinks[i];
        processedModelUrls.add(url);

        await processSingleModel(driver, mainHandle, url, i + 1, newLinks.length);
        await sleep(BETWEEN_ITEMS_MS);
      }

      const moved = await goToNextPage(driver, pageKey);

      if (!moved) {
        console.log("No next page found. Scraping finished.");
        break;
      }
    }

    console.log(`Saved file: ${OUTPUT_FILE}`);
  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    // await driver.quit();
  }
}

main();

