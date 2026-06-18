const fs = require('fs');
const path = require('path');

const PRIMES_FILE = path.join(__dirname, '../data/primes.json');
const EVENT_RELIC_FILE = path.join(__dirname, '../data/eventRelic.json');
const FRAMES_OUTPUT = path.join(__dirname, '../data/frames.json');
const WEAPONS_OUTPUT = path.join(__dirname, '../data/weapons.json');

const FRAME_PARTS = ['neuroptics', 'systems', 'chassis', 'blueprint'];

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return {};
  }
}

// Возвращает количество уникальных FRAME_PARTS у предмета
function countFrameParts(items) {
  const uniqueFrameParts = new Set();

  items.forEach(item => {
    const lowerName = item.item.toLowerCase();
    for (const part of FRAME_PARTS) {
      if (lowerName.includes(part)) {
        uniqueFrameParts.add(part);
        break;
      }
    }
  });

  return uniqueFrameParts.size;
}

function separateItems() {
  const primesData = readJSON(PRIMES_FILE);
  const eventRelicData = readJSON(EVENT_RELIC_FILE);

  // Собери все parts каждого предмета из ВСЕХ источников
  const allItemsParts = {};

  // Обработай current
  Object.entries(primesData.current || {}).forEach(([name, items]) => {
    if (Array.isArray(items)) {
      if (!allItemsParts[name]) allItemsParts[name] = [];
      allItemsParts[name].push(...items);
    }
  });

  // Обработай added
  Object.entries(primesData.added || {}).forEach(([name, items]) => {
    if (Array.isArray(items)) {
      if (!allItemsParts[name]) allItemsParts[name] = [];
      allItemsParts[name].push(...items);
    }
  });

  // Обработай eventRelic
  Object.entries(eventRelicData).forEach(([name, items]) => {
    if (name === 'status' || name === 'varziaPeriod' || !Array.isArray(items)) return;
    if (!allItemsParts[name]) allItemsParts[name] = [];
    allItemsParts[name].push(...items);
  });

  // Теперь классифицируй каждый предмет один раз, используя ВСЕ его parts
  const frames = new Set();
  const sentinels = new Set();
  const weapons = new Set();

  Object.entries(allItemsParts).forEach(([name, items]) => {
    const partCount = countFrameParts(items);

    if (partCount >= 3) {
      frames.add(name);
    } else if (partCount === 2) {
      sentinels.add(name);
    } else {
      weapons.add(name);
    }
  });

  const existingFrames = readJSON(FRAMES_OUTPUT);
  const existingWeapons = readJSON(WEAPONS_OUTPUT);

  const framesArray = existingFrames.frames || [];
  const sentinelsArray = existingFrames.sentinels || [];
  const weaponsArray = existingWeapons.weapons || [];

  const newFrames = new Set([...framesArray, ...frames]);
  const newSentinels = new Set([...sentinelsArray, ...sentinels]);
  const newWeapons = new Set([...weaponsArray, ...weapons]);

  fs.writeFileSync(
    FRAMES_OUTPUT,
    JSON.stringify({
      frames: Array.from(newFrames).sort(),
      sentinels: Array.from(newSentinels).sort()
    }, null, 2)
  );

  fs.writeFileSync(
    WEAPONS_OUTPUT,
    JSON.stringify({ weapons: Array.from(newWeapons).sort() }, null, 2)
  );

  const framesAdded = newFrames.size - framesArray.length;
  const sentinelsAdded = newSentinels.size - sentinelsArray.length;
  const weaponsAdded = newWeapons.size - weaponsArray.length;

  console.log(`Frames: ${newFrames.size} (added: ${framesAdded})`);
  console.log(`Sentinels: ${newSentinels.size} (added: ${sentinelsAdded})`);
  console.log(`Weapons: ${newWeapons.size} (added: ${weaponsAdded})`);
}

separateItems();