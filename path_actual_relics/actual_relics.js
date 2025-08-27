document.addEventListener('DOMContentLoaded', async () => {
  const relicGrid = document.getElementById('relicGrid');
  const filterSelect = document.getElementById('typeFilter');
  const dateElem = document.getElementById('date');

  // Загружаем дату обновления
  try {
    const resDate = await fetch('../public/last_update.json');
    if (!resDate.ok) throw new Error('Не удалось загрузить last_update.json');

    const data = await resDate.json();
    dateElem.textContent = `Дата обновления: ${data.date}`;
  } catch (err) {
    console.error('❌ Ошибка при получении даты:', err);
    dateElem.textContent = 'Дата обновления: неизвестна';
  }

  // Загружаем реликвии
  const resRelics = await fetch('../public/relics.json');
  const relicsData = await resRelics.json();

  // Извлекаем added для определения новых реликвий
  const addedRelics = new Set(relicsData.added.map(relic => relic.slug));

  // Объединяем current и added для отображения всех актуальных реликвий
  const relics = [
    ...relicsData.current,
    ...relicsData.added
  ];

  render(relics, addedRelics);

  filterSelect.addEventListener('change', () => render(relics, addedRelics));

  function render(relics, addedRelics) {
    const filter = filterSelect.value;
    relicGrid.innerHTML = ''; // очищаем

    relics.forEach(relic => {
      if (filter !== 'all' && relic.tier !== filter) return;

      const card = document.createElement('div');
      card.className = 'relic-card';
      // Добавляем класс new, если реликвия в added
      if (addedRelics.has(relic.slug)) {
        card.classList.add('new');
      }

      // Фоновый блок
      const bg = document.createElement('div');
      bg.className = 'grid-background';
      bg.style.backgroundImage = `url('../img/relic/${relic.tier}.png')`;
      bg.style.backgroundPosition = '100px';
      bg.style.backgroundRepeat = 'no-repeat';

      // Оверлей с текстом
      const overlay = document.createElement('div');
      overlay.className = 'blur-overlay';
      overlay.innerHTML = `
        <div class="relic-title">${relic.name}</div>
        <div class="relic-tier">${relic.tier} Relic${addedRelics.has(relic.slug) ? ' <span class="new-badge">NEW</span>' : ''}</div>
        <div class="relic-link">
          <a class="market-link" href="https://warframe.market/items/${relic.slug}/dropsources" target="_blank">
            Открыть
          </a>
        </div>
      `;

      bg.appendChild(overlay);
      card.appendChild(bg);
      relicGrid.appendChild(card);
    });
  }
});