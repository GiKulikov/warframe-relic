document.getElementById('date').textContent = `Дата обновления: ${new Date().toLocaleDateString()}`;
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
      sections.forEach(sec => {
        sec.querySelectorAll('p').forEach(p => {
          relics.push(p.textContent.trim());
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

    async function main() {
      const container = document.getElementById('primesContainer');
      container.innerText = 'Загрузка данных...';

      const relics = await fetchRelics();
      const doc = await fetchDropPage();

      const tables = Array.from(doc.querySelectorAll('table'));
      const primes = {};

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
            const frameName = extractFrameName(itemName);
            if (frameName) {
              if (!primes[frameName]) primes[frameName] = [];
              const exists = primes[frameName].some(entry => entry.item === itemName && entry.relic === currentRelic);
              if (!exists) primes[frameName].push({ item: itemName, relic: currentRelic });
            }
          }
        });
      });

      container.innerHTML = '';
      Object.entries(primes).forEach(([name, parts]) => {
        const card = document.createElement('div');
        card.className = 'prime-card';
        card.innerHTML = `
          <h2>${name}</h2>
          <p>${parts.length} частей в актуальных реликвиях</p>
        `;
        card.onclick = () => {
          const encoded = encodeURIComponent(name);
          window.location.href = `prime_details.html?name=${encoded}`;
        };
        container.appendChild(card);
      });
      card.querySelector('.market-btn').addEventListener('mouseenter', () => {
  card.querySelector('.frame-name').style.color = '#7d3cff';
});
card.querySelector('.market-btn').addEventListener('mouseleave', () => {
  card.querySelector('.frame-name').style.color = '';
});

card.querySelector('.relic-btn').addEventListener('mouseenter', () => {
  card.querySelector('.relic-name').style.color = '#d538a4';
});
card.querySelector('.relic-btn').addEventListener('mouseleave', () => {
  card.querySelector('.relic-name').style.color = '';
});
    }

    main();