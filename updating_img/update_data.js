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
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return parsed;
  } catch {
    return fallback;
  }
}

// При чтении старых файлов поддерживаем оба старых формата:
// - массив/объект целиком
// - объект вида { current, added?, removed? }
function getOldRelicsArray(oldFileParsed) {
  if (!oldFileParsed) return [];
  if (Array.isArray(oldFileParsed)) return oldFileParsed;
  if (Array.isArray(oldFileParsed.current)) return oldFileParsed.current;
  return [];
}

function getOldPrimesObject(oldFileParsed) {
  if (!oldFileParsed) return {};
  if (oldFileParsed && !Array.isArray(oldFileParsed) && typeof oldFileParsed === 'object') {
    if (oldFileParsed.current && typeof oldFileParsed.current === 'object' && !Array.isArray(oldFileParsed.current)) {
      return oldFileParsed.current;
    }
    // старый формат мог быть просто { "Volt Prime": [...] }
    return oldFileParsed;
  }
  return {};
}

// ========== parsing ==========
function extractPrime(item) {
  const parts = ['Blueprint', 'Chassis', 'Neuroptics', 'Systems', 'Barrel', 'Receiver', 'Stock', 'Blade', 'Blades', 'Chain', 'Claws', 'Disc', 'Grip', 'String', 'Upper Limb', 'Lower Limb', 'Handle', 'Hilt', 'Guard', 'Gauntlet', 'Boot', 'Head', 'Pouch', 'Stars', 'Ornament', 'Link', 'Band', 'Buckle', 'Carapace', 'Cerebrum', 'Harness', 'Wings', 'Tail', 'Mask', 'Limb', 'Capacitor', 'Engine', 'Shield'];
  const itemNorm = normalizeText(item);
  for (const p of parts) {
    const idx = itemNorm.indexOf(` Prime ${p}`);
    if (idx > 0) return itemNorm.slice(0, idx + 6); // "... Prime"
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

// Обычные (Unvaulted) реликвии
async function getAllRelics() {
  const doc = await fetchDoc(VOID_RELIC);
  const cap = Array.from(doc.querySelectorAll('caption'))
    .find(c => c.textContent.includes('Unvaulted/Available Relics'));
  const table = cap?.closest('table');
  const relics = [];

  if (!table) return relics;

  table.querySelectorAll('td').forEach((td, i) => {
    if (i % 5 === 4) return; // пропустить Requiem колонку
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
        // ключ на основе нормализованной пары item|relic
        const key = normalizeText(entry.item) + '|' + normalizeText(entry.relic);
        const exists = primes[frame].some(e => (normalizeText(e.item) + '|' + normalizeText(e.relic)) === key);
        if (!exists) {
          primes[frame].push(entry);
        }
      }
    });
    await new Promise(r => setTimeout(r, 200)); // задержка, чтобы не спамить
  }
  return primes;
}

// Варзия — ивент-реликвии (без diff, с учетом частей оружия)
async function parseEventRelics() {
  const $ = await fetchHTML(VARZIA);
  const relics = [];

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
  for (const relic of relics) {
    try {
      const $rel = await fetchHTML(relic.url);
      $rel('table tbody tr').each((_, row) => {
        const itemName = normalizeText($rel(row).find('td').first().text());
        const primeName = extractPrime(itemName);
        if (primeName) {
          if (!relicMap[primeName]) relicMap[primeName] = [];
          // Добавляем часть без фильтрации, так как нужны и варфреймы, и оружие
          relicMap[primeName].push({ item: itemName, relic: relic.name });
        }
      });
    } catch (e) {
      console.error(`Ошибка при обработке ${relic.name}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  return relicMap;
}

// ========== diffs ==========
// Для relics: сравниваем по slug. current — берём объекты ИЗ СТАРОГО.
function diffRelics(oldArr, newArr) {
  // индексация
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

  // пересечение и удалённые
  for (const [slug, oldObj] of oldMap.entries()) {
    if (newMap.has(slug)) {
      current.push(oldObj); // берём старую версию
    } else {
      removed.push(oldObj);
    }
  }
  // добавленные
  for (const [slug, newObj] of newMap.entries()) {
    if (!oldMap.has(slug)) {
      added.push(newObj);
    }
  }

  // опционально — сортируем по slug для стабильности
  current.sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));
  added.sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));
  removed.sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));

  return { current, added, removed };
}

// Для primes: глубокое сравнение по ключам-праймам и по парам item|relic.
// current — берём элементы ИЗ СТАРОГО.
function diffPrimesDeep(oldObj, newObj) {
  // Сопоставим ключи по нормализованным названиям
  const oldKeyByNorm = new Map();
  Object.keys(oldObj).forEach(k => oldKeyByNorm.set(normalizeText(k), k));
  const newKeyByNorm = new Map();
  Object.keys(newObj).forEach(k => newKeyByNorm.set(normalizeText(k), k));

  const current = {};
  const added = {};
  const removed = {};

  // Ключи, которые есть в новом
  for (const [normKey, newKey] of newKeyByNorm.entries()) {
    const newItems = Array.isArray(newObj[newKey]) ? newObj[newKey] : [];
    const oldKey = oldKeyByNorm.get(normKey);

    if (oldKey) {
      const oldItems = Array.isArray(oldObj[oldKey]) ? oldObj[oldKey] : [];

      // строим множества по ключу item|relic
      const oldSet = new Set(oldItems.map(e => normalizeText(e.item) + '|' + normalizeText(e.relic)));
      const newSet = new Set(newItems.map(e => normalizeText(e.item) + '|' + normalizeText(e.relic)));

      const curList = oldItems.filter(e => newSet.has(normalizeText(e.item) + '|' + normalizeText(e.relic)));
      const addList = newItems.filter(e => !oldSet.has(normalizeText(e.item) + '|' + normalizeText(e.relic)));
      const remList = oldItems.filter(e => !newSet.has(normalizeText(e.item) + '|' + normalizeText(e.relic)));

      if (curList.length) current[oldKey] = curList;      // под старым ключом
      if (addList.length) added[newKey] = addList;        // под новым ключом (если имя менялось — будет видно)
      if (remList.length) removed[oldKey] = remList;      // под старым ключом
    } else {
      // полностью новый прайм
      if (newItems.length) added[newKey] = newItems;
    }
  }

  // Ключи, которые были в старом, но исчезли в новом
  for (const [normKey, oldKey] of oldKeyByNorm.entries()) {
    if (!newKeyByNorm.has(normKey)) {
      const oldItems = Array.isArray(oldObj[oldKey]) ? oldObj[oldKey] : [];
      if (oldItems.length) removed[oldKey] = oldItems;
    }
  }

  return { current, added, removed };
}

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
  safeWriteJSON(path.join('public', 'eventRelic.json'), eventPr);

  // --- last_update.json ---
  const lastUpdatePath = path.join(__dirname, '..', 'public', 'last_update.json');
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  safeWriteJSON(lastUpdatePath, { date: dateStr });

  console.log('✅ Готово. Данные собраны.');
}

main().catch(console.error);