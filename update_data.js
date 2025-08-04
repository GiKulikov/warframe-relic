const fs = require('fs');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

const RELICS_URL = 'https://kusobako.github.io/warframe/available-relics';
const DROPTABLE_URL = 'https://warframe-web-assets.nyc3.cdn.digitaloceanspaces.com/uploads/cms/hnfvc0o3jnfvc873njb03enrf56.html';

function toSlug(text) {
  return text.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '') + '_relic';
}

function extractFrameName(partName) {
  const primeParts = ['Systems', 'Blueprint', 'Chassis', 'Neuroptics'];
  for (const part of primeParts) {
    const idx = partName.indexOf(` Prime ${part}`);
    if (idx > 0) {
      return partName.slice(0, idx + 6);
    }
  }
  return null;
}

async function fetchDOM(url) {
  const res = await fetch(url);
  const text = await res.text();
  return new JSDOM(text).window.document;
}

async function main() {
  console.log('⏳ Загружаем данные...');

  const relicsDom = await fetchDOM(RELICS_URL);
  const dropDom = await fetchDOM(DROPTABLE_URL);

  const sections = relicsDom.querySelectorAll('section.relics__list');
  const relics = [];
  const relicNames = [];

  sections.forEach(section => {
    const tier = section.querySelector('h2')?.textContent.trim();
    section.querySelectorAll('p').forEach(p => {
      const name = p.textContent.trim();
      relics.push({
        name,
        tier,
        slug: toSlug(name)
      });
      relicNames.push(name);
    });
  });

  console.log(`✅ Найдено ${relics.length} реликвий`);

  const tables = Array.from(dropDom.querySelectorAll('table'));
  const primes = {}; // { frameName: [ { item, relic } ] }

  tables.forEach(table => {
    let currentRelic = null;

    table.querySelectorAll('tr').forEach(row => {
      const th = row.querySelector('th[colspan]');
      const td = row.querySelectorAll('td');

      if (th) {
        const relicTitle = th.textContent.trim();
        const match = relicTitle.match(/^([A-Za-z]+ \w+) Relic/);
        currentRelic = match ? match[1] : null;
      } else if (td.length === 2 && currentRelic && relicNames.includes(currentRelic)) {
        const itemName = td[0].textContent.trim();
        const frameName = extractFrameName(itemName);
        if (frameName) {
          if (!primes[frameName]) primes[frameName] = [];
          const exists = primes[frameName].some(entry => entry.item === itemName && entry.relic === currentRelic);
          if (!exists) primes[frameName].push({ item: itemName, relic: currentRelic });
        }
      }
    });
  });

  const outputDir = './public'; // или './data' — смотри где у тебя JSON-файлы
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  fs.writeFileSync(`${outputDir}/relics.json`, JSON.stringify(relics, null, 2));
  fs.writeFileSync(`${outputDir}/primes.json`, JSON.stringify(primes, null, 2));

  console.log(`✅ Сохранено: relics.json (${relics.length}), primes.json (${Object.keys(primes).length} кадров)`);
}

main().catch(err => {
  console.error('❌ Ошибка:', err);
});
