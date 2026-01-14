const fs = require('fs');
const fetch = require('node-fetch');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const path = require('path');

const BASE = 'https://wiki.warframe.com';
const VOID_RELIC = `${BASE}/w/Void_Relic`;
const VARZIA = `${BASE}/w/Varzia`;

// ========== utils ==========
function normalizeText(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function toSlug(txt) {
  return normalizeText(txt).toLowerCase().replace(/\s+/g, '_').replace(/'/g, '') + '_relic';
}

function safeWriteJSON(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadOldJSON(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function getOldRelicsArray(oldFileParsed) {
  if (!oldFileParsed) return [];
  if (Array.isArray(oldFileParsed)) return oldFileParsed;
  const current = Array.isArray(oldFileParsed.current) ? oldFileParsed.current : [];
  const added = Array.isArray(oldFileParsed.added) ? oldFileParsed.added : [];
  return [...current, ...added];
}

function getOldPrimesObject(oldFileParsed) {
  if (!oldFileParsed) return {};
  if (Array.isArray(oldFileParsed)) return {};
  if (oldFileParsed && typeof oldFileParsed === 'object') {
    const result = {};
    const sources = [];
    if (oldFileParsed.current && typeof oldFileParsed.current === 'object' && !Array.isArray(oldFileParsed.current)) {
      sources.push(oldFileParsed.current);
    }
    if (oldFileParsed.added && typeof oldFileParsed.added === 'object' && !Array.isArray(oldFileParsed.added)) {
      sources.push(oldFileParsed.added);
    }
    if (sources.length === 0 && Object.keys(oldFileParsed).length > 0) {
      sources.push(oldFileParsed);
    }
    for (const src of sources) {
      for (const k in src) {
        if (Array.isArray(src[k])) {
          result[k] = result[k] || [];
          const existingKeys = new Set(result[k].map(e => normalizeText(e.item) + '|' + normalizeText(e.relic)));
          for (const entry of src[k]) {
            const key = normalizeText(entry.item) + '|' + normalizeText(entry.relic);
            if (!existingKeys.has(key)) {
              result[k].push(entry);
              existingKeys.add(key);
            }
          }
        }
      }
    }
    return result;
  }
  return {};
}

// ========== parsing ==========
function extractPrime(item) {
  const parts = ['Blueprint', 'Chassis', 'Neuroptics', 'Systems', 'Barrel', 'Receiver', 'Stock', 'Blade', 'Blades', 'Chain', 'Claws', 'Disc', 'Grip', 'String', 'Upper Limb', 'Lower Limb', 'Handle', 'Hilt', 'Guard', 'Gauntlet', 'Boot', 'Head', 'Pouch', 'Stars', 'Ornament', 'Link', 'Band', 'Buckle', 'Carapace', 'Cerebrum', 'Harness', 'Wings', 'Tail', 'Mask', 'Limb', 'Capacitor', 'Engine', 'Shield'];
  const itemNorm = normalizeText(item);
  for (const p of parts) {
    const idx = itemNorm.indexOf(` Prime ${p}`);
    if (idx > 0) return itemNorm.slice(0, idx + 6);
  }
  return null;
}

async function fetchDoc(url) {
  const html = await (await fetch(url)).text();
  return new JSDOM(html).window.document;
}

async function fetchHTML(url) {
  const { data } = await axios.get(url);
  return cheerio.load(data);
}

async function getAllRelics() {
  const doc = await fetchDoc(VOID_RELIC);
  const cap = Array.from(doc.querySelectorAll('caption'))
    .find(c => c.textContent.includes('Unvaulted/Available Relics'));
  const table = cap?.closest('table');
  const relics = [];

  if (!table) return relics;

  table.querySelectorAll('td').forEach((td, i) => {
    if (i % 5 === 4) return;
    td.querySelectorAll('li a').forEach(a => {
      const rawName = a.textContent;
      const name = normalizeText(rawName);
      const tier = name.split(/\s+/)[0];
      relics.push({
        name,
        tier,
        slug: toSlug(name),
        url: BASE + a.getAttribute('href')
      });
    });
  });

  return relics;
}

async function parseDrops(relics) {
  const primes = {};
  for (const r of relics) {
    const doc = await fetchDoc(r.url);
    doc.querySelectorAll('table tbody tr').forEach(tr => {
      const itemRaw = tr.querySelector('td')?.textContent || '';
      const item = normalizeText(itemRaw);
      const frame = item && extractPrime(item);
      if (frame) {
        const entry = { item, relic: r.name };
        primes[frame] = primes[frame] || [];
        const key = normalizeText(entry.item) + '|' + normalizeText(entry.relic);
        const exists = primes[frame].some(e => (normalizeText(e.item) + '|' + normalizeText(e.relic)) === key);
        if (!exists) {
          primes[frame].push(entry);
        }
      }
    });
    await new Promise(r => setTimeout(r, 200));
  }
  const deduped = {};
  Object.keys(primes).forEach(key => {
    const normKey = normalizeText(key);
    if (!deduped[normKey]) {
      deduped[normKey] = primes[key];
    } else {
      const existingKeys = new Set(deduped[normKey].map(e => normalizeText(e.item) + '|' + normalizeText(e.relic)));
      primes[key].forEach(entry => {
        const entryKey = normalizeText(entry.item) + '|' + normalizeText(entry.relic);
        if (!existingKeys.has(entryKey)) {
          deduped[normKey].push(entry);
          existingKeys.add(entryKey);
        }
      });
    }
  });
  const result = {};
  Object.keys(deduped).forEach(normKey => {
    const originalKey = Object.keys(primes).find(k => normalizeText(k) === normKey) || normKey;
    result[originalKey] = deduped[normKey];
  });
  return result;
}

async function parseEventRelics() {
  const $ = await fetchHTML(VARZIA);
  const relics = [];

  // Собираем все доступные реликвии
  $('table tbody tr').each((_, row) => {
    const $row = $(row);
    const relicCell = $row.find('td').eq(0);
    const statusCell = $row.find('td').eq(1);

    if (normalizeText(statusCell.text()).includes('☑')) {
      const relicName = normalizeText(relicCell.text());
      const href = relicCell.find('a').attr('href');
      if (href) {
        relics.push({
          name: relicName,
          url: BASE + href,
          tier: relicName.split(' ')[0],
          slug: toSlug(relicName)
        });
      }
    }
  });

  const relicMap = {};

  // Парсим детали каждой реликвии
  for (const relic of relics) {
    try {
      const $rel = await fetchHTML(relic.url);

      $rel('table tbody tr').each((_, row) => {
        const itemName = normalizeText($rel(row).find('td').first().text());
        const primeName = extractPrime(itemName);
        if (primeName) {
          if (!relicMap[primeName]) relicMap[primeName] = [];
          // Оставляем только название реликвии
          const cleanRelicName = relic.name.split('{')[0].trim();
          relicMap[primeName].push({ item: itemName, relic: cleanRelicName });
        }
      });

    } catch (e) {
      console.error(`Ошибка при обработке ${relic.name}: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  // ──────────────────────────────────────────────
  // Добавляем период доступности Варзии
  let varziaPeriod = [];

  try {
    const traderData = await fetch("https://api.warframestat.us/pc/vaultTrader")
      .then(res => res.json());

    // Проверяем, что сейчас именно Варзия (на всякий случай)
    if (traderData?.character?.toLowerCase().includes('varzia') &&
        traderData.activation && traderData.expiry) {
      
      varziaPeriod = [{
        startDate: traderData.activation,
        endDate: traderData.expiry
      }];
    }
    // Если в будущем API начнёт возвращать массив — можно будет легко доработать
  } catch (err) {
    console.warn('Не удалось получить даты Варзии:', err.message);
    // Можно оставить пустой массив или записать fallback-значения
  }
  // ──────────────────────────────────────────────

  // Read the previous eventRelic.json file, if it exists
  const filePath = path.join('public', 'eventRelic.json');
  let previousData = {};
  try {
    previousData = loadOldJSON(filePath, {});
    delete previousData.status;
    // Если раньше уже было поле varziaPeriod — его тоже можно удалить для чистого сравнения
    delete previousData.varziaPeriod;
  } catch (e) {
    console.log('No previous eventRelic.json found or error reading file:', e.message);
  }

  const isIdentical = JSON.stringify(relicMap) === JSON.stringify(previousData);

  const output = {
    status: isIdentical ? 'NotUpdated' : 'Updated',
    varziaPeriod,           // ← добавляем сюда
    ...relicMap
  };

  safeWriteJSON(filePath, output);

  return output;
}


// ========== diffs ==========
function diffRelics(oldArr, newArr) {
  const oldMap = new Map();
  for (const x of oldArr) {
    const slug = x.slug ? normalizeText(x.slug) : toSlug(x.name || '');
    oldMap.set(slug, x);
  }
  const newMap = new Map();
  for (const x of newArr) {
    const slug = x.slug ? normalizeText(x.slug) : toSlug(x.name || '');
    newMap.set(slug, x);
  }

  const current = [];
  const added = [];
  const removed = [];

  for (const [slug, oldObj] of oldMap.entries()) {
    if (newMap.has(slug)) {
      current.push(oldObj);
    } else {
      removed.push(oldObj);
    }
  }
  for (const [slug, newObj] of newMap.entries()) {
    if (!oldMap.has(slug)) {
      added.push(newObj);
    }
  }

  current.sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));
  added.sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));
  removed.sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));

  return { current, added, removed };
}

function diffPrimesDeep(oldObj, newObj) {
  const oldKeyByNorm = new Map();
  Object.keys(oldObj).forEach(k => oldKeyByNorm.set(normalizeText(k), k));
  const newKeyByNorm = new Map();
  Object.keys(newObj).forEach(k => newKeyByNorm.set(normalizeText(k), k));

  const current = {};
  const added = {};
  const removed = {};

  for (const [normKey, newKey] of newKeyByNorm.entries()) {
    const newItems = Array.isArray(newObj[newKey]) ? newObj[newKey] : [];
    const oldKey = oldKeyByNorm.get(normKey);

    if (oldKey) {
      const oldItems = Array.isArray(oldObj[oldKey]) ? oldObj[oldKey] : [];
      const oldSet = new Set(oldItems.map(e => normalizeText(e.item) + '|' + normalizeText(e.relic)));
      const newSet = new Set(newItems.map(e => normalizeText(e.item) + '|' + normalizeText(e.relic)));

      const curList = oldItems.filter(e => newSet.has(normalizeText(e.item) + '|' + normalizeText(e.relic)));
      const addList = newItems.filter(e => !oldSet.has(normalizeText(e.item) + '|' + normalizeText(e.relic)));
      const remList = oldItems.filter(e => !newSet.has(normalizeText(e.item) + '|' + normalizeText(e.relic)));

      if (curList.length) current[oldKey] = curList;
      if (addList.length) added[newKey] = addList;
      if (remList.length) removed[oldKey] = remList;
    } else {
      if (newItems.length) added[newKey] = newItems;
    }
  }

  for (const [normKey, oldKey] of oldKeyByNorm.entries()) {
    if (!newKeyByNorm.has(normKey)) {
      const oldItems = Array.isArray(oldObj[oldKey]) ? oldObj[oldKey] : [];
      if (oldItems.length) removed[oldKey] = oldItems;
    }
  }

  return { current, added, removed };
}

// ========== GitHub Actions Setup ==========


// ========== main ==========
async function main() {
  fs.mkdirSync('./public', { recursive: true });

  // --- relics.json ---
  const relics = await getAllRelics();
  const relicsData = relics.map(r => ({ name: r.name, tier: r.tier, slug: r.slug }));
  const relicsPath = path.join('public', 'relics.json');
  const oldRelicsParsed = loadOldJSON(relicsPath, null);
  const oldRelicsArr = getOldRelicsArray(oldRelicsParsed);
  const relicsDiff = diffRelics(oldRelicsArr, relicsData);
  safeWriteJSON(relicsPath, relicsDiff);

  // --- primes.json ---
  const primes = await parseDrops(relics);
  const primesPath = path.join('public', 'primes.json');
  const oldPrimesParsed = loadOldJSON(primesPath, null);
  const oldPrimesObj = getOldPrimesObject(oldPrimesParsed);
  const primesDiff = diffPrimesDeep(oldPrimesObj, primes);
  safeWriteJSON(primesPath, primesDiff);

  // --- eventRelic.json ---
  const eventPr = await parseEventRelics();

 

  // --- last_update.json ---
  const lastUpdatePath = path.join(__dirname, '..', 'public', 'last_update.json');
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  safeWriteJSON(lastUpdatePath, { date: dateStr });
}

main().catch(console.error);
module.exports = { parseEventRelics };