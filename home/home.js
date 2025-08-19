/* ========= Общие хелперы для ленивой загрузки ========= */

// Пытаемся загрузить первый доступный URL из списка (последовательно)
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

// Один IntersectionObserver на весь файл
const __lazyCards = new WeakMap(); // card -> { urls, placeholder }
const __io = new IntersectionObserver(async (entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;

    const card = entry.target;
    const cfg = __lazyCards.get(card);
    if (!cfg) { __io.unobserve(card); continue; }

    const bg = card.querySelector('.grid-background');
    const url = await loadFirstAvailable(cfg.urls);
    bg.style.backgroundImage = `url('${url || cfg.placeholder}')`;

    __lazyCards.delete(card);
    __io.unobserve(card);
  }
}, { rootMargin: '200px 0px', threshold: 0.1 });

// Регистрируем карточку на ленивую подгрузку
function registerLazyCard(card, urls, placeholder) {
  const bg = card.querySelector('.grid-background');
  bg.style.backgroundImage = `url('${placeholder}')`;
  // Универсальные настройки фона (как у тебя)
  bg.style.backgroundPosition = 'top center';
  bg.style.backgroundSize = 'contain';
  bg.style.backgroundRepeat = 'no-repeat';

  __lazyCards.set(card, { urls, placeholder });
  __io.observe(card);
}

// Общий плейсхолдер
const PLACEHOLDER = '../img/placeholder.jpg';


/* ========= // for relics ========= */
document.addEventListener('DOMContentLoaded', async () => {
  // Выпадающее меню (оставлено без изменений)
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

  // Загрузка реликвий
  const relicGrid = document.getElementById('relicGrid');
  const res = await fetch('../public/relics.json');
  const relics = await res.json();

  // Группируем реликвии по tier
  const byTier = relics.reduce((acc, r) => {
    acc[r.tier] = acc[r.tier] || [];
    acc[r.tier].push(r);
    return acc;
  }, {});

  // Для каждого нужного tier берём случайно по 2 элемента
  const desiredTiers = ['Lith','Meso','Neo','Axi'];
  const selected = [];
  desiredTiers.forEach(tier => {
    const list = (byTier[tier] || []).slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    selected.push(...list.slice(0,2));
  });

  // Перемешиваем итоговый массив
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  // Рендерим (ленивая загрузка фона по tier)
  selected.forEach((relic, i) => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    const span = (i % 3 === 0) ? 25 : 20;
    item.style.setProperty('--span', span);

    const bg = document.createElement('div');
    bg.className = 'grid-background';

    const overlay = document.createElement('div');
    overlay.className = 'blur-overlay';
    overlay.innerHTML = `
      <div class="relic-title">${relic.name}</div>
      <div class="relic-tier">${relic.tier} Relic</div>
    `;

    bg.appendChild(overlay);
    item.appendChild(bg);

    item.addEventListener('click', () => {
      window.open(`https://warframe.market/items/${relic.slug}/dropsources`, '_blank');
    });

    relicGrid.appendChild(item);

    // Ленивая загрузка: один URL — картинка тира
    registerLazyCard(item, [
      `../img/relic/${relic.tier}.png`
    ], PLACEHOLDER);
  });
});


/* ========= // for prime ========= */
document.addEventListener('DOMContentLoaded', async () => {
  const primeGrid = document.getElementById('relicGrid2');
  if (!primeGrid) return;

  primeGrid.innerText = 'Загрузка прайм частей...';

  let primes;
  try {
    const res = await fetch('../public/primes.json');
    primes = await res.json();
  } catch (err) {
    primeGrid.innerText = 'Ошибка загрузки прайм частей.';
    console.error(err);
    return;
  }

  primeGrid.innerHTML = '';

  const entries = Object.entries(primes);
  const top8 = entries
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 8);

  top8.forEach(([name, parts], i) => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.style.setProperty('--span', (i % 3 === 0) ? 25 : 20);

    const bg = document.createElement('div');
    bg.className = 'grid-background';

    const overlay = document.createElement('div');
    overlay.className = 'blur-overlay';
    overlay.innerHTML = `
      <div class="relic-title">${name}</div>
      <div class="relic-tier">${parts.length} частей</div>
    `;

    bg.appendChild(overlay);
    item.appendChild(bg);

    item.addEventListener('click', () => {
      const encoded = encodeURIComponent(name);
      window.location.href = `../path_prime/prime_details.html?name=${encoded}`;
    });

    primeGrid.appendChild(item);

    // Ленивая загрузка: сначала пробуем frame, затем weapon
    registerLazyCard(item, [
      `../img/frame/${name}.png`,
      `../img/weapon/${name}.png`
    ], PLACEHOLDER);
  });
});


/* ========= // varzia relics ========= */
document.addEventListener('DOMContentLoaded', async () => {
  const varziaGrid = document.getElementById('relicGrid3');
  if (!varziaGrid) return;

  varziaGrid.innerText = 'Загрузка данных Вазарии...';

  let events;
  try {
    const res = await fetch('../public/eventRelic.json');
    events = await res.json();
  } catch (err) {
    varziaGrid.innerText = 'Ошибка загрузки данных Вазарии.';
    console.error(err);
    return;
  }

  varziaGrid.innerHTML = '';

  const entries = Object.entries(events);
  const top8 = entries
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 8);

  for (const [i, [name, parts]] of top8.entries()) {
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.style.setProperty('--span', (i % 3 === 0) ? 25 : 20);

    const bg = document.createElement('div');
    bg.className = 'grid-background';

    const overlay = document.createElement('div');
    overlay.className = 'blur-overlay';
    overlay.innerHTML = `
      <div class="relic-title">${name}</div>
      <div class="relic-tier">${parts.length} частей</div>
    `;

    bg.appendChild(overlay);
    item.appendChild(bg);

    item.addEventListener('click', () => {
      const encoded = encodeURIComponent(name);
      window.location.href = `../path_varzia_relic/varzia_details.html?name=${encoded}`;
    });

    varziaGrid.appendChild(item);

    // Ленивая загрузка: frame → weapon
    registerLazyCard(item, [
      `../img/frame/${name}.png`,
      `../img/weapon/${name}.png`
    ], PLACEHOLDER);
  }
});


/* ========= // Vazar timer ========= */
document.addEventListener('DOMContentLoaded', () => {
  const timerElem = document.getElementById('columinfo-content_varzia');
  const DURATION_DAYS = 30;

  async function startTimer() {
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
      if (timerElem) timerElem.textContent = 'Ошибка загрузки даты';
    }
  }

  if (timerElem) startTimer();
});


/* ========= // Установка даты ========= */
document.addEventListener('DOMContentLoaded', async () => {
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
});
