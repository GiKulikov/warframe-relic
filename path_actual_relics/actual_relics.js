document.addEventListener('DOMContentLoaded', async () => {
  const relicGrid = document.getElementById('relicGrid');
  const filterSelect = document.getElementById('typeFilter');

  // Установка даты
  document.getElementById('date').textContent = `Дата обновления: ${new Date().toLocaleDateString()}`;

  const res = await fetch('/public/relics.json');
  const relics = await res.json();

  render(relics);

  filterSelect.addEventListener('change', () => render(relics));

  function render(data) {
    const filter = filterSelect.value;
    relicGrid.innerHTML = ''; // очищаем

    data.forEach(relic => {
      if (filter !== 'all' && relic.tier !== filter) return;

      const card = document.createElement('div');
      card.className = 'relic-card';

      card.innerHTML = `
        <div class="relic-title">${relic.name}</div>
        <div class="relic-tier">${relic.tier} Relic</div>
        <div class="relic-link">
          <a class="market-link" href="https://warframe.market/items/${relic.slug}/dropsources" target="_blank">
            Открыть
          </a>
        </div>
      `;

      relicGrid.appendChild(card);
    });
  }
});
