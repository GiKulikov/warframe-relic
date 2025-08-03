async function getDOM(url) {
  const proxied = 'https://corsproxy.io/?' + encodeURIComponent(url);
  const res = await fetch(proxied);
  const text = await res.text();
  return new DOMParser().parseFromString(text, 'text/html');
}

async function fetchRelics() {
  const dom = await getDOM('https://kusobako.github.io/warframe/available-relics');
  const sections = dom.querySelectorAll('section.relics__list');
  const relics = [];

  sections.forEach(section => {
    const names = section.querySelectorAll('p');
    names.forEach(p => {
      const name = p.textContent.trim();
      relics.push(name);
    });
  });

  return relics;
}

async function fetchDropPage() {
  return await getDOM('https://warframe-web-assets.nyc3.cdn.digitaloceanspaces.com/uploads/cms/hnfvc0o3jnfvc873njb03enrf56.html');
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

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function toMarketSlug(text) {
  return text.toLowerCase().replace(/\s+/g, '_');
}

async function main() {
  const frameName = getQueryParam('name');
  document.getElementById('frameTitle').innerText = frameName || 'Прайм персонаж';

  const relics = await fetchRelics();
  const doc = await fetchDropPage();

  const tables = Array.from(doc.querySelectorAll('table'));
  const parts = [];

  tables.forEach(table => {
    let currentRelic = null;

    table.querySelectorAll('tr').forEach(row => {
      const th = row.querySelector('th[colspan]');
      const td = row.querySelectorAll('td');

      if (th) {
        const relicTitle = th.textContent.trim();
        const match = relicTitle.match(/^([A-Za-z]+ \w+) Relic/);
        currentRelic = match ? match[1] : null;
      } else if (td.length === 2 && currentRelic && relics.includes(currentRelic)) {
        const itemName = td[0].textContent.trim();
        const extractedName = extractFrameName(itemName);
        if (extractedName === frameName) {
          const exists = parts.some(p => p.item === itemName && p.relic === currentRelic);
          if (!exists) {
            parts.push({ item: itemName, relic: currentRelic });
          }
        }
      }
    });
  });

  const container = document.getElementById('partsContainer');
  container.innerHTML = '';

  if (parts.length === 0) {
    container.innerHTML = '<p>Нет данных о частях этого прайм-фрейма.</p>';
    return;
  }


 parts.forEach(({ item, relic }) => {
  const card = document.createElement('div');
  card.className = 'part-card';

  const marketSetSlug = toMarketSlug(item.replace(/\s+/g, '_').replace(/'/g, '').toLowerCase());
  const relicSlug = toMarketSlug(relic) + '_relic';

  card.innerHTML = `
    <strong><span class="frame-name">${item}</span></strong><br>
    Выпадает из реликвии: <b><span class="relic-name">${relic}</span></b><br><br>

    <button class="market-btn" onclick="window.open('https://warframe.market/items/${marketSetSlug}', '_blank')">
      Warframe Market
    </button>
    <button class="relic-btn" onclick="window.open('https://warframe.market/items/${relicSlug}/dropsources', '_blank')">
      Источник реликвии
    </button>
  `;

  // Добавляем подсветку текста при наведении
  const frameName = card.querySelector('.frame-name');
  const relicName = card.querySelector('.relic-name');
  const marketBtn = card.querySelector('.market-btn');
  const relicBtn = card.querySelector('.relic-btn');

  marketBtn.addEventListener('mouseenter', () => {
    frameName.style.color = '#aa62ecff';
    frameName.style.textFontWeight = 'bold';
  });
  marketBtn.addEventListener('mouseleave', () => {
    frameName.style.color = '';
  });

  relicBtn.addEventListener('mouseenter', () => {
    relicName.style.color = '#aa62ecff';
  });
  relicBtn.addEventListener('mouseleave', () => {
    relicName.style.color = '';
  });

  container.appendChild(card);
});

}

main();
