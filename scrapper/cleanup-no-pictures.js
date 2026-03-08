#!/usr/bin/env node
/**
 * Remove profile folders from scrapper/images that have no picture files.
 * Also removes from models.json and models_48xgeorgia.json any profile entries
 * whose pictures array is empty or whose image files don't exist on disk.
 */
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'images');
const MODELS_JSON = path.join(__dirname, 'models.json');
const MODELS_48X_JSON = path.join(__dirname, 'models_48xgeorgia.json');

const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif)$/i;

function countImagesInFolder(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && IMAGE_EXT.test(e.name)).length;
  } catch {
    return 0;
  }
}

function fileExists(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  try {
    return fs.statSync(fullPath).isFile();
  } catch {
    return false;
  }
}

function main() {
  let removedFolders = 0;
  let removedFromModels = 0;
  let removedFrom48x = 0;

  // 1. Remove folders with no images
  if (fs.existsSync(IMAGES_DIR)) {
    const dirs = fs.readdirSync(IMAGES_DIR, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const dirPath = path.join(IMAGES_DIR, d.name);
      const count = countImagesInFolder(dirPath);
      if (count === 0) {
        fs.rmSync(dirPath, { recursive: true });
        console.log(`Removed empty folder: ${d.name}`);
        removedFolders++;
      }
    }
  }

  // 2. Filter models.json - keep only profiles that have at least one existing picture
  if (fs.existsSync(MODELS_JSON)) {
    const data = JSON.parse(fs.readFileSync(MODELS_JSON, 'utf-8'));
    const before = data.length;
    const filtered = data.filter((r) => {
      const pics = r['სურათები'] || [];
      if (pics.length === 0) return false;
      const hasExisting = pics.some((p) => fileExists(p));
      return hasExisting;
    });
    const after = filtered.length;
    if (after < before) {
      fs.writeFileSync(MODELS_JSON, JSON.stringify(filtered, null, 2), 'utf-8');
      removedFromModels = before - after;
      console.log(`models.json: removed ${removedFromModels} profiles without pictures`);
    }
  }

  // 3. Filter models_48xgeorgia.json
  if (fs.existsSync(MODELS_48X_JSON)) {
    const data = JSON.parse(fs.readFileSync(MODELS_48X_JSON, 'utf-8'));
    const before = data.length;
    const filtered = data.filter((r) => {
      const pics = r.pictures || [];
      if (pics.length === 0) return false;
      const hasExisting = pics.some((p) => fileExists(p));
      return hasExisting;
    });
    const after = filtered.length;
    if (after < before) {
      fs.writeFileSync(MODELS_48X_JSON, JSON.stringify(filtered, null, 2), 'utf-8');
      removedFrom48x = before - after;
      console.log(`models_48xgeorgia.json: removed ${removedFrom48x} profiles without pictures`);
    }
  }

  console.log(
    `Done. Removed ${removedFolders} folders, ${removedFromModels} from models.json, ${removedFrom48x} from models_48xgeorgia.json`
  );
}

main();
