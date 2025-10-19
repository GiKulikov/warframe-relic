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

  

  // Загрузка прайм-частей///////////////////////////////////////////////////////////////////////////////
  const primeGrid = document.getElementById('primesContainer');
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
        ...oldPrimes // Дополняем до 9
      ];

      primeGrid.innerHTML = '';

      selectedPrimes.forEach(([name, parts], i) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.innerHTML = `
        <div class="description-card">
         ${i < newPrimes.length ? '<label class="new-badge">NEW</label>' : ''}
          <label class="name-card">${name}</label>
          <label class="addition">${parts.length} частей в актуальных реликвиях</label>
         
        </div>
        `;
        if (i < newPrimes.length) item.classList.add('new');

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

  
});
async function initPrimeSearchStyled() {
  const container = document.getElementById('primesContainer');
  const searchInput = document.getElementById('searchInput');
  container.innerText = 'Загрузка данных...';

  // Загружаем JSON с праймами
  let primes = {};
  try {
    const res = await fetch('../public/primes.json');
    if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
    primes = await res.json();
  } catch (err) {
    container.innerText = 'Ошибка загрузки данных.';
    console.error(err);
    return;
  }

  // Функция поиска и отображения,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
  function searchPrimes(filter = '') {
    container.innerHTML = '';

    const namesSet = new Set([
      ...Object.keys(primes.current || {}),
      ...Object.keys(primes.added || {})
    ]);

    const lowerFilter = filter.toLowerCase().trim();

    // Ищем совпадения
    const results = Array.from(namesSet)
      .filter(name => {
        if (name.toLowerCase().includes(lowerFilter)) return true;

        const allRelics = [
          ...(primes.current[name] || []),
          ...(primes.added[name] || [])
        ];
        return allRelics.some(r =>
          r.relic && r.relic.toLowerCase().includes(lowerFilter)
        );
      })
      .map(name => {
        const currentParts = primes.current[name] || [];
        const addedParts = primes.added[name] || [];
        return [name, [...currentParts, ...addedParts]];
      });

    if (!results.length) {
      container.innerHTML = '<p>Ничего не найдено.</p>';
      return;
    }

    // Создаём элементы в нужном формате
    results.forEach(([name, parts], i) => {
      const item = document.createElement('div');
      item.className = 'grid-item';
      item.innerHTML = `
      <div class="description-card">
    ${ (primes.added[name] && primes.added[name].length > 0) ? '<label class="new-badge">NEW</label>' : '' }
    <label class="name-card">${name}</label>
    <label class="addition">${parts.length} частей в актуальных реликвиях</label>
  </div>
      `;

      if (primes.added[name] && primes.added[name].length > 0) item.classList.add('new');
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

      container.appendChild(item);
      registerLazyCard(item, [
          `../img/frame/${name}.png`,
          `../img/weapon/${name}.png`
        ], PLACEHOLDER);
    });
  }

  // Привязка поиска к полю
  searchInput.addEventListener('input', () => {
    searchPrimes(searchInput.value);
  });

  // Первичный вывод
  searchPrimes('');
}

document.addEventListener('DOMContentLoaded', initPrimeSearchStyled);
