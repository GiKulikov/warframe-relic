const fs = require('fs');
const path = require('path');
const axios = require('axios');

const FRAMES_FILE = path.join(__dirname, '../data/frames.json');
const WEAPONS_FILE = path.join(__dirname, '../data/weapons.json');
const FRAME_IMG_DIR = path.join(__dirname, '../img/frame');
const WEAPON_IMG_DIR = path.join(__dirname, '../img/weapon');

const WIKI_API = 'https://wiki.warframe.com/api.php';

const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'WarframeInfoApp/1.0 (educational project; contact@example.com)',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://wiki.warframe.com/',
    'Origin': 'https://wiki.warframe.com'
  }
});

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatName(name) {
  return name;
}

async function getImageUrl(pageName) {
  try {
    const noSpaces = pageName.replace(/\s+/g, '');
    const withUnderscores = pageName.replace(/\s+/g, '_');

    // Стратегия 1: прямой поиск файла
    const candidates = [
      `File:${noSpaces}.png`,
      `File:${withUnderscores}.png`,
      `File:${noSpaces}ProfilePic.png`,
      `File:${withUnderscores}ProfilePic.png`,
    ];

    const titlesParam = candidates.join('|');
    const infoUrl = `${WIKI_API}?action=query&titles=${encodeURIComponent(titlesParam)}&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json`;
    const infoRes = await axiosInstance.get(infoUrl);
    const filePages = infoRes.data.query.pages;

    for (const p of Object.values(filePages)) {
      if (p.imageinfo?.[0]?.thumburl) return p.imageinfo[0].thumburl;
      if (p.imageinfo?.[0]?.url) return p.imageinfo[0].url;
    }

    // Стратегия 2: ищем страницу, если не найдена — пробуем без "Prime"
    const pagesToTry = [withUnderscores];
    if (pageName.includes(' Prime')) {
      pagesToTry.push(pageName.replace(' Prime', '').replace(/\s+/g, '_'));
    }

    for (const pageTitle of pagesToTry) {
      const pageUrl = `${WIKI_API}?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&imlimit=20&redirects=1&format=json`;
      const pageRes = await axiosInstance.get(pageUrl);
      const pages = pageRes.data.query.pages;
      const page = Object.values(pages)[0];

      if (page.missing !== undefined) continue; // страница не существует

      if (!page.images?.length) continue;

      const nameParts = pageName.toLowerCase().split(' ');
      const pngFiles = page.images
        .map(img => img.title)
        .filter(t => t.toLowerCase().endsWith('.png'));

      const best =
        pngFiles.find(f => nameParts.every(part => f.toLowerCase().includes(part))) ||
        pngFiles.find(f => f.toLowerCase().includes(nameParts[0])) ||
        pngFiles[0];

      if (!best) continue;

      const bestInfoUrl = `${WIKI_API}?action=query&titles=${encodeURIComponent(best)}&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json`;
      const bestRes = await axiosInstance.get(bestInfoUrl);
      const bestPages = bestRes.data.query.pages;
      const bestPage = Object.values(bestPages)[0];

      const url = bestPage?.imageinfo?.[0]?.thumburl || bestPage?.imageinfo?.[0]?.url;
      if (url) return url;
    }

    return null;

  } catch (err) {
    console.error(`  Error for "${pageName}":`, err.message);
    return null;
  }
}

async function downloadImage(url, filePath) {
  try {
    const response = await axiosInstance.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, response.data);
    return true;
  } catch (err) {
    return false;
  }
}

async function processFrames() {
  const data = JSON.parse(fs.readFileSync(FRAMES_FILE, 'utf8'));
  ensureDir(FRAME_IMG_DIR);

  let downloaded = 0;
  let skipped = 0;

  const allFrames = [
    ...(data.frames || []),
    ...(data.sentinels || [])
  ];

  for (const name of allFrames) {
    const fileName = `${formatName(name)}.png`;
    const filePath = path.join(FRAME_IMG_DIR, fileName);

    if (fs.existsSync(filePath)) {
      skipped++;
      continue;
    }

    console.log(`  Getting: ${name}`);

    const imageUrl = await getImageUrl(name);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (imageUrl && await downloadImage(imageUrl, filePath)) {
      downloaded++;
      console.log(`  Downloaded`);
    } else {
      console.log(`  Failed`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  return { downloaded, skipped };
}

async function processWeapons() {
  const data = JSON.parse(fs.readFileSync(WEAPONS_FILE, 'utf8'));
  ensureDir(WEAPON_IMG_DIR);

  let downloaded = 0;
  let skipped = 0;

  for (const name of data.weapons || []) {
    const fileName = `${formatName(name)}.png`;
    const filePath = path.join(WEAPON_IMG_DIR, fileName);

    if (fs.existsSync(filePath)) {
      skipped++;
      continue;
    }

    console.log(`  Getting: ${name}`);

    const imageUrl = await getImageUrl(name);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (imageUrl && await downloadImage(imageUrl, filePath)) {
      downloaded++;
      console.log(`  Downloaded`);
    } else {
      console.log(`  Failed`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  return { downloaded, skipped };
}

async function main() {
  console.log('Downloading frame images...');
  const frames = await processFrames();
  console.log(`Frames: ${frames.downloaded} downloaded, ${frames.skipped} skipped`);

  console.log('Downloading weapon images...');
  const weapons = await processWeapons();
  console.log(`Weapons: ${weapons.downloaded} downloaded, ${weapons.skipped} skipped`);
}

main();