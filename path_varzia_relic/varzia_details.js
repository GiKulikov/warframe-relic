document.addEventListener('DOMContentLoaded', async () => {
  const frameName = new URLSearchParams(window.location.search).get('name');
  document.getElementById('frameTitle').innerText = frameName || 'Прайм персонаж';

  const res = await fetch('../public/eventRelic.json');
  const primes = await res.json();

  const parts = primes[frameName] || [];

  const container = document.getElementById('partsContainer');
  container.innerHTML = '';

  if (parts.length === 0) {
    container.innerHTML = '<p>Нет данных о частях этого прайм-фрейма.</p>';
    return;
  }

  parts.forEach(({ item, relic }) => {
    const card = document.createElement('div');
    card.className = 'part-card';

    const marketSetSlug = item.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');
   

    card.innerHTML = `
      <strong><span class="frame-name">${item}</span></strong><br>
      Выпадает из реликвии: <b><span class="relic-name">${relic}</span></b><br><br>

      <button class="market-btn" onclick="window.open('https://warframe.market/items/${marketSetSlug}', '_blank')">
        Warframe Market
      </button>
      
    `;

    const frameEl = card.querySelector('.frame-name');


    card.querySelector('.market-btn').addEventListener('mouseenter', () => {
      frameEl.style.color = '#aa62ecff';
    });
    card.querySelector('.market-btn').addEventListener('mouseleave', () => {
      frameEl.style.color = '';
    });

   

    container.appendChild(card);
  });
});
