function loadFirstAvailable(urls) {
  return new Promise((resolve) => {
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) return resolve('');
      const testImg = new Image();
      const url = urls[i++];
      testImg.onload = () => resolve(url);
      testImg.onerror = tryNext;
      testImg.src = url;
    };
    tryNext();
  });
}

const __lazyCards = new WeakMap();
const __io = new IntersectionObserver(async (entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;

    const card = entry.target;
    const cfg = __lazyCards.get(card);
    if (!cfg) { __io.unobserve(card); continue; }

    const bg = card.querySelector('.item-img');
    const url = await loadFirstAvailable(cfg.urls);
    bg.style.backgroundImage = `url('${url || cfg.placeholder}')`;

    __lazyCards.delete(card);
    __io.unobserve(card);
  }
}, { rootMargin: '200px 0px', threshold: 0.1 });

function registerLazyCard(card, urls, placeholder) {
  const bg = card.querySelector('.item-img');
  bg.style.backgroundImage = `url('${placeholder}')`;
  bg.style.backgroundPosition = 'top center';
  bg.style.backgroundSize = 'contain';
  bg.style.backgroundRepeat = 'no-repeat';

  __lazyCards.set(card, { urls, placeholder });
  __io.observe(card);
}

const PLACEHOLDER = '../img/placeholder.png';
const relicGrid = document.getElementById('relicGrid');
const typeFilter = document.getElementById('typeFilter');
let uniqueRelics = [];

function renderRelics(filterType, newRelicNames) {
  relicGrid.innerHTML = '';

  const filteredRelics = filterType === 'all' 
    ? uniqueRelics 
    : uniqueRelics.filter(relic => relic.tier === filterType);

  filteredRelics.forEach((relic, i) => {
    if (!relic) return;
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.innerHTML = `
      <div class="description-card">
        <label class="name-card">${relic.name}</label>
        <label class="addition">${relic.tier} Relic</label>
        ${newRelicNames.has(relic.name) ? '<label class="new-badge">NEW</label>' : ''}
      </div>
    `;

    const bg = document.createElement('div');
    bg.className = 'item-background';
    bg.textContent = relic.name;

    const overlay = document.createElement('div');
    overlay.className = 'item-img';

    bg.appendChild(overlay);
    item.appendChild(bg);

    item.addEventListener('click', () => {
      window.open(`https://wiki.warframe.com/w/${relic.name}`, '_blank');
    });

    relicGrid.appendChild(item);

    registerLazyCard(item, [`../img/relic/${relic.tier}.png`], PLACEHOLDER);
  });

  if (filteredRelics.length === 0) {
    relicGrid.innerText = 'Нет доступных реликвий для выбранного типа.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dateElem = document.getElementById('date');
  fetch('../public/last_update.json')
    .then(res => {
      if (!res.ok) throw new Error('Не удалось загрузить last_update.json');
      return res.json();
    })
    .then(data => {
      if (dateElem) dateElem.textContent = `Дата обновления: ${data.date}`;
    })
    .catch(err => {
      console.error('❌ Ошибка при получении даты:', err);
      if (dateElem) dateElem.textContent = 'Дата обновления: неизвестна';
    });

  if (relicGrid) {
    fetch('../public/relics.json')
      .then(res => res.json())
      .then(relicsData => {
        // Объединяем все реликвии (added и current) в один массив
        const allRelics = [...(relicsData.added || []), ...(relicsData.current || [])];
        // Сохраняем имена новых реликвий для метки NEW
        const newRelicNames = new Set((relicsData.added || []).map(relic => relic.name));

        // Удаляем дубликаты по имени
        const usedNames = new Set();
        uniqueRelics = allRelics.filter(relic => {
          if (!usedNames.has(relic.name)) {
            usedNames.add(relic.name);
            return true;
          }
          return false;
        });

        // Первоначальный рендеринг всех реликвий
        renderRelics('all', newRelicNames);

        // Добавляем обработчик события для фильтра
        if (typeFilter) {
          typeFilter.addEventListener('change', (e) => {
            renderRelics(e.target.value, newRelicNames);
          });
        }
      })
      .catch(err => {
        relicGrid.innerText = 'Ошибка загрузки реликвий.';
        console.error(err);
      });
  }
});