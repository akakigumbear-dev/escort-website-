/*
Install:
npm uninstall chromedriver
npm install selenium-webdriver@latest

Run:
node scraper.js
*/

const fs = require("fs/promises");
const path = require("path");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const SITE_URL = "https://eskorti.ge/";
const OUTPUT_FILE = path.join(__dirname, "models.json");

const RETRY_INTERVAL_MS = 3000;
const PAGE_LOAD_WAIT_MS = 15000;
const ELEMENT_WAIT_MS = 10000;
const PROFILE_WAIT_AFTER_OPEN_MS = 2000;
const BETWEEN_ITEMS_MS = 1200;
const BETWEEN_PAGES_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

async function appendRecord(record) {
  const data = await readJsonArray();

  const exists = data.some((item) => {
    const sameUrl =
      normalizeText(item.url) && normalizeText(item.url) === normalizeText(record.url);

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

  // Visible browser only
  options.addArguments("--start-maximized");
  options.addArguments("--disable-blink-features=AutomationControlled");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  return driver;
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
  } catch {
    // continue anyway
  }
}

async function waitAndClickAgeModal(driver) {
  console.log("Waiting for +18 modal...");

  while (true) {
    try {
      const button = await safeFindElement(driver, By.css("button.ageModalButton"));

      if (button) {
        const visible = await button.isDisplayed().catch(() => false);

        if (visible) {
          await driver.executeScript("arguments[0].click();", button);
          console.log("+18 clicked");
          return;
        }
      }
    } catch (err) {
      console.log("Age modal click retry:", err.message);
    }

    await sleep(RETRY_INTERVAL_MS);
  }
}

async function waitForModelsIndefinitely(driver) {
  console.log("Waiting indefinitely for div.models...");
  console.log("If site is blocked or captcha appears, solve it manually in the browser.");
  console.log("Script will continue automatically when div.models becomes available.");

  while (true) {
    try {
      const models = await safeFindElement(driver, By.css("div.models"));

      if (models) {
        const displayed = await models.isDisplayed().catch(() => true);
        if (displayed) {
          console.log("div.models detected");
          return models;
        }
      }
    } catch (err) {
      console.log("Still waiting for div.models:", err.message);
    }

    await sleep(RETRY_INTERVAL_MS);
  }
}

async function collectModelLinks(driver) {
  console.log("Collecting model links from current page...");

  const items = await driver.findElements(By.css("div.models div.model-item"));
  const links = [];

  for (let i = 0; i < items.length; i++) {
    try {
      let href = null;

      try {
        const a = await items[i].findElement(By.css("a[href]"));
        href = await a.getAttribute("href");
      } catch {
        // fallback below
      }

      if (!href) {
        href = await driver.executeScript(
          `
          const item = arguments[0];
          const a = item.querySelector('a[href]');
          return a ? a.href : null;
          `,
          items[i]
        );
      }

      if (href && !links.includes(href)) {
        links.push(href);
      }
    } catch (err) {
      console.log(`Failed to extract model link #${i + 1}:`, err.message);
    }
  }

  console.log(`Collected ${links.length} model links on this page`);
  return links;
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
  const data = await driver.executeScript(() => {
    const clean = (value) => (value ? String(value).replace(/\s+/g, " ").trim() : "");

    const findValue = (label) => {
      const nodes = [...document.querySelectorAll(".profile-info-container div")];

      for (const node of nodes) {
        const text = clean(node.innerText);
        if (text.includes(label)) {
          const strong = node.querySelector("strong");
          return strong ? clean(strong.innerText) : "";
        }
      }

      return "";
    };

    const findParam = (label) => {
      const nodes = [...document.querySelectorAll(".profile-params div")];

      for (const node of nodes) {
        const span = node.querySelector("span");
        if (span && clean(span.innerText).includes(label)) {
          const strong = node.querySelector("strong");
          return strong ? clean(strong.innerText) : "";
        }
      }

      return "";
    };

    let name = "";
    const infoBlocks = [...document.querySelectorAll(".profile-info-container div")];

    for (const block of infoBlocks) {
      const text = clean(block.innerText);
      if (text.includes("სახელი")) {
        const strong = block.querySelector("strong");
        if (strong) {
          name = clean(strong.innerText);
          break;
        }
      }
    }

    if (!name) {
      const firstStrong = document.querySelector(".profile-info-container strong");
      if (firstStrong) {
        name = clean(firstStrong.innerText);
      }
    }

    const phoneEl = document.querySelector(".phone a");
    const phone = phoneEl ? clean(phoneEl.innerText) : "";

    const imageLinks = [
      ...document.querySelectorAll('.profile-images a[data-fancybox="gallery"]'),
    ];

    const images = imageLinks
      .map((a) => {
        const href = a.getAttribute("href");
        if (!href) return null;

        try {
          return new URL(href, window.location.href).href;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const uniqueImages = [...new Set(images)];

    return {
      "სახელი": name,
      "ტელეფონი": phone,
      "ქვეყანა": findValue("ქვეყანა"),
      "ქალაქი": findValue("ქალაქი"),
      "ეროვნება": findParam("ეროვნება"),
      "სიმაღლე": findParam("სიმაღლე"),
      "წონა": findParam("წონა"),
      "ენები": findParam("ენები"),
      "გოგო": findParam("გოგო"),
      "სურათები": uniqueImages,
    };
  });

  return data;
}

async function processSingleModel(driver, mainHandle, url, index, total) {
  console.log(`[${index}/${total}] Opening: ${url}`);

  let openedNewTab = false;

  try {
    await switchToNewTab(driver, url);
    openedNewTab = true;

    await sleep(PROFILE_WAIT_AFTER_OPEN_MS);

    const profile = await extractEscortProfile(driver);

    const finalRecord = {
      ...profile,
      url,
      scrapedAt: new Date().toISOString(),
    };

    await appendRecord(finalRecord);

    console.log(
      `[${index}/${total}] Done: ${finalRecord["სახელი"] || "Unknown"}`
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
    const url = await driver.getCurrentUrl();
    return url;
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

  // ტექსტით ძებნაც დავამატოთ
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
        if (displayed && href) {
          return link;
        }
      }
    } catch {}
  }

  return null;
}

async function goToNextPage(driver, previousPageKey) {
  const nextEl = await findNextPageElement(driver);

  if (!nextEl) {
    return false;
  }

  console.log("Trying to open next page...");

  let nextHref = "";
  try {
    nextHref = await nextEl.getAttribute("href");
  } catch {}

  try {
    await driver.executeScript("arguments[0].scrollIntoView({block:'center'});", nextEl);
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

  // თუ უცვლელია გვერდი, direct url-ითაც ვცადოთ
  let currentPageKey = await getCurrentPageKey(driver);

  if (currentPageKey === previousPageKey && nextHref) {
    await driver.get(nextHref);
    await waitUntilPageReady(driver);
    await sleep(BETWEEN_PAGES_MS);
    currentPageKey = await getCurrentPageKey(driver);
  }

  // შემდეგ გვერდზეც ისევ დაველოდოთ models-ს
  await waitForModelsIndefinitely(driver);

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
    console.log("Opening site...");
    await driver.get(SITE_URL);
    await waitUntilPageReady(driver);

    await waitAndClickAgeModal(driver);
    await waitForModelsIndefinitely(driver);

    const mainHandle = await driver.getWindowHandle();

    const processedPageKeys = new Set();
    const processedModelUrls = new Set();

    while (true) {
      const pageKey = await getCurrentPageKey(driver);

      if (processedPageKeys.has(pageKey)) {
        console.log("This page was already processed. Stopping pagination loop.");
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
  }
}

main();