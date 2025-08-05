const fs = require('fs');
const fsp = require('fs').promises;
const fetch = require('node-fetch');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const path = require('path');

const BASE = 'https://wiki.warframe.com';
const VOID_RELIC = `${BASE}/w/Void_Relic`;
const VARZIA = `${BASE}/w/Varzia`;

function toSlug(txt) {
  return txt.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '') + '_relic';
}

function extractPrime(item) {
  const parts = ['Systems', 'Blueprint', 'Chassis', 'Neuroptics'];
  for (const p of parts) {
    const idx = item.indexOf(` Prime ${p}`);
    if (idx > 0) return item.slice(0, idx + 6);
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

  table.querySelectorAll('td').forEach((td, i) => {
    if (i % 5 === 4) return; // Пропустить Requiem колонку
    td.querySelectorAll('li a').forEach(a => {
      const name = a.textContent.trim();
      const tier = name.trim().split(/\s+/)[0];
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
      const item = tr.querySelector('td')?.textContent.trim();
      const frame = item && extractPrime(item);
      if (frame) {
        primes[frame] = primes[frame] || [];
        if (!primes[frame].some(e => e.item === item && e.relic === r.name)) {
          primes[frame].push({ item, relic: r.name });
        }
      }
    });
    await new Promise(r => setTimeout(r, 200)); // задержка
  }
  return primes;
}

// Варзия — ивент-реликвии
async function parseEventRelics() {
  const $ = await fetchHTML(VARZIA);
  const relics = [];

  $('table tbody tr').each((_, row) => {
    const $row = $(row);
    const relicCell = $row.find('td').eq(0);
    const statusCell = $row.find('td').eq(1);

    if (statusCell.text().includes('☑')) {
      const relicName = relicCell.text().trim();
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
        const itemName = $rel(row).find('td').first().text().trim();
        const primeName = extractPrime(itemName);
        if (primeName) {
          if (!relicMap[primeName]) relicMap[primeName] = [];
          relicMap[primeName].push({ item: itemName, relic: relic.name });
        }
      });
    } catch (e) {
      console.error(`Ошибка при обработке ${relic.name}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 200)); // задержка
  }

  return relicMap;
}

async function main() {
  const relics = await getAllRelics();
  fs.mkdirSync('./public', { recursive: true });

  // relics.json
  fs.writeFileSync('public/relics.json', JSON.stringify(
    relics.map(r => ({ name: r.name, tier: r.tier, slug: r.slug })), null, 2));

  // primes.json
  const primes = await parseDrops(relics);
  fs.writeFileSync('public/primes.json', JSON.stringify(primes, null, 2));

  // eventRelic.json
  const eventPr = await parseEventRelics();
  fs.writeFileSync('public/eventRelic.json', JSON.stringify(eventPr, null, 2));
  const filePath = path.join(__dirname, 'public', 'last_update.json');
  
  function saveCurrentDate() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // Формат YYYY-MM-DD
    const data = { date: dateStr };
  
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('Дата обновления записана:', dateStr);
  }
  
  saveCurrentDate();

  console.log('✅ Всё готово!');
}

main().catch(console.error);
