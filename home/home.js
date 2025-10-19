/* ========= Общие хелперы для ленивой загрузки ========= */
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

document.addEventListener('DOMContentLoaded', async () => {
  // Выпадающее меню
  const infoLink = document.querySelector('.info-link');
  const dropdown = document.querySelector('.dropdown');
  if (infoLink && dropdown) {
    infoLink.addEventListener('click', e => {
      e.preventDefault();
      dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    });
    document.addEventListener('click', e => {
      if (!infoLink.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  // Установка даты
  const dateElem = document.getElementById('date');
  try {
    const res = await fetch('../public/last_update.json');
    if (!res.ok) throw new Error('Не удалось загрузить last_update.json');
    const data = await res.json();
    if (dateElem) dateElem.textContent = `Дата обновления: ${data.date}`;
  } catch (err) {
    console.error('❌ Ошибка при получении даты:', err);
    if (dateElem) dateElem.textContent = 'Дата обновления: неизвестна';
  }

  // Таймер Варзии
  const timerElem = document.getElementById('columinfo-content_varzia');
  if (timerElem) {
    const DURATION_DAYS = 30;
    try {
      const response = await fetch('../public/last_update.json');
      const data = await response.json();
      const dateStr = (data.date || '').trim();
      const parts = dateStr.split('-');
      if (parts.length !== 3) throw new Error('Неверный формат даты');

      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const lastUpdateDate = new Date(year, month, day);
      if (isNaN(lastUpdateDate)) throw new Error('Дата некорректна');

      const endDate = new Date(lastUpdateDate.getTime() + DURATION_DAYS * 24 * 60 * 60 * 1000);

      function updateTimer() {
        const now = new Date();
        const diffMs = endDate - now;

        if (diffMs <= 0) {
          timerElem.textContent = 'Вазария — срок 30 дней истёк';
          clearInterval(intervalId);
          return;
        }

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

        timerElem.textContent = `Вазария  ${days}д,  ${hours}ч,   ${minutes}м`;
      }

      updateTimer();
      const intervalId = setInterval(updateTimer, 60000);
    } catch (e) {
      console.error(e);
      timerElem.textContent = 'Ошибка загрузки даты';
    }
  }

// Загрузка реликвий
const relicGrid = document.getElementById('relicGrid');
if (relicGrid) {
  try {
    const res = await fetch('../public/relics.json');
    const relicsData = await res.json();

    // Группируем реликвии по tier
    const newByTier = (relicsData.added || []).reduce((acc, r) => {
      acc[r.tier] = acc[r.tier] || [];
      acc[r.tier].push(r);
      return acc;
    }, {});
    const oldByTier = (relicsData.current || []).reduce((acc, r) => {
      acc[r.tier] = acc[r.tier] || [];
      acc[r.tier].push(r);
      return acc;
    }, {});

    // Выбираем до 4 новых реликвий по типам (Lith, Meso, Neo, Axi)
    const desiredTiers = ['Lith', 'Meso', 'Neo', 'Axi'];
    const newRelics = desiredTiers
      .map(tier => (newByTier[tier] || [])[Math.floor(Math.random() * (newByTier[tier] || []).length)] || null)
      .filter(r => r);

    // Выбираем старые реликвии по типам, исключая уже выбранные типы
    const usedTiers = newRelics.map(r => r.tier);
    const remainingTiers = desiredTiers.filter(tier => !usedTiers.includes(tier));
    const oldRelicsByType = remainingTiers
      .map(tier => (oldByTier[tier] || [])[Math.floor(Math.random() * (oldByTier[tier] || []).length)] || null)
      .filter(r => r);

    // Дополняем до 8 реликвий, повторяя цикл типов
    let selectedRelics = [...newRelics, ...oldRelicsByType];
    let usedNames = selectedRelics.map(r => r.name);
    let needed = 8 - selectedRelics.length;

    while (needed > 0) {
      for (const tier of desiredTiers) {
        if (needed <= 0) break;
        const available = (oldByTier[tier] || []).filter(r => !usedNames.includes(r.name));
        if (available.length > 0) {
          const selected = available[Math.floor(Math.random() * available.length)];
          selectedRelics.push(selected);
          usedNames.push(selected.name);
          needed--;
        }
      }
    }

    selectedRelics = selectedRelics.slice(0, 8);

    relicGrid.innerHTML = '';

    selectedRelics.forEach((relic, i) => {
      if (!relic) return; // Пропускаем, если реликвия не найдена
      const item = document.createElement('div');
      item.className = 'grid-item';
      item.innerHTML = `
        <div class="description-card">
          <label class="name-card">${relic.name}</label>
          <label class="addition">${relic.tier} Relic</label>
          ${i < newRelics.length ? '<label class="new-badge">NEW</label>' : ''}
        </div>
      `;
      if (i < newRelics.length) item.classList.add('new'); // Метка NEW только для новых
      item.style.setProperty('--span', (i % 3 === 0) ? 25 : 20);

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

    if (selectedRelics.length === 0) {
      relicGrid.innerText = 'Нет доступных реликвий.';
    }
  } catch (err) {
    relicGrid.innerText = 'Ошибка загрузки реликвий.';
    console.error(err);
  }
}

  // Загрузка прайм-частей///////////////////////////////////////////////////////////////////////////////
  const primeGrid = document.getElementById('relicGrid2');
  if (primeGrid) {
    try {
      primeGrid.innerText = 'Загрузка прайм частей...';
      const res = await fetch('../public/primes.json');
      const primes = await res.json();

      // Новые прайм-объекты (полностью новые, которых не было раньше)
      const newPrimes = Object.entries(primes.added).filter(([name]) => {
        return !(name in primes.current) && !(name in primes.removed);
      }).slice(0, 4);

      // Старые прайм-объекты (сортировка по количеству частей)
      const oldPrimes = Object.entries(primes.current)
        .sort(([, a], [, b]) => b.length - a.length);

      // Заполняем до 9 карточек: сначала новые, затем старые
      const selectedPrimes = [
        ...newPrimes,
        ...oldPrimes.slice(0, 9 - newPrimes.length) // Дополняем до 9
      ].slice(0, 8);

      primeGrid.innerHTML = '';

      selectedPrimes.forEach(([name, parts], i) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.innerHTML = `
       <div class="description-card">
          <label class="name-card">${name}</label>
          <label class="addition">${parts.length} частей</label>
          ${i < newPrimes.length ? '<label class="new-badge">NEW</label>' : ''}
        </div>

        `;
        if (i < newPrimes.length) item.classList.add('new');
        item.style.setProperty('--span', (i % 3 === 0) ? 25 : 20);

        const bg = document.createElement('div');
        bg.className = 'item-background';
        bg.textContent = name; 
        

        const overlay = document.createElement('div');
        overlay.className = 'item-img';
       
       
        bg.appendChild(overlay);
        item.appendChild(bg);

        item.addEventListener('click', () => {
          const encoded = encodeURIComponent(name);
          window.location.href = `../path_prime/prime_details.html?name=${encoded}`;
        });

        primeGrid.appendChild(item);

        registerLazyCard(item, [
          `../img/frame/${name}.png`,
          `../img/weapon/${name}.png`
        ], PLACEHOLDER);
      });

      if (selectedPrimes.length === 0) {
        primeGrid.innerText = 'Нет доступных прайм-частей.';
      }
    } catch (err) {
      primeGrid.innerText = 'Ошибка загрузки прайм частей.';
      console.error(err);
    }
  }

  // Загрузка данных Варзии................................................................................
  const varziaGrid = document.getElementById('relicGrid3');
  if (varziaGrid) {
    try {
      varziaGrid.innerText = 'Загрузка данных Вазарии...';
      const res = await fetch('../public/eventRelic.json');
      const events = await res.json();

      const top8 = Object.entries(events)
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 8);

      varziaGrid.innerHTML = '';

      top8.forEach(([name, parts], i) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.innerHTML = `
          <div class="description-card">
          <label class="name-card">${name}</label>
          <label class="addition">${parts.length} частей</label>
          
        </div>
        `;
        item.style.setProperty('--span', (i % 3 === 0) ? 25 : 20);

        const bg = document.createElement('div');
        bg.className = 'item-background';
        bg.textContent = name;

        const overlay = document.createElement('div');
        overlay.className = 'item-img';
        

        bg.appendChild(overlay);
        item.appendChild(bg);

        item.addEventListener('click', () => {
          const encoded = encodeURIComponent(name);
          window.location.href = `../path_varzia_relic/varzia_details.html?name=${encoded}`;
        });

        varziaGrid.appendChild(item);

        registerLazyCard(item, [
          `../img/frame/${name}.png`,
          `../img/weapon/${name}.png`
        ], PLACEHOLDER);
      });
    } catch (err) {
      varziaGrid.innerText = 'Ошибка загрузки данных Вазарии.';
      console.error(err);
    }
  }
});