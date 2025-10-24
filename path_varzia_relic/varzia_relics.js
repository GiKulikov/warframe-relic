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
  const container = document.getElementById('primesContainer');
  const searchInput = document.getElementById('searchInput');
  const dateElem = document.getElementById('date');

  

  // Загрузка данных для Varzia
 if (container) {
  try {
    container.innerText = 'Загрузка данных...';
    const res = await fetch('../public/eventRelic.json');
    if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
    const primes = await res.json();

    // Проверяем статус и прекращаем обработку, если status == "NotUpdated"
    if (primes.status === 'NotUpdated') {
      container.innerText = 'Данные Варзии не обновлены.';
      return;
    }

    // Функция рендера с фильтром
    const renderPrimes = (filter = '') => {
      container.innerHTML = '';
      const lowerFilter = filter.toLowerCase().trim();

      const entries = Object.entries(primes)
        .filter(([name]) => name !== 'status') // Пропускаем поле status
        .filter(([name]) => {
          if (lowerFilter === '') return true;
          return name.toLowerCase().includes(lowerFilter);
        });

      if (entries.length === 0) {
        container.innerHTML = '<p>Ничего не найдено.</p>';
        return;
      }

      entries.forEach(([name, parts], i) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.innerHTML = `
          <div class="description-card">
            <label class="name-card">${name}</label>
            <label class="addition">${parts.length} частей в актуальных реликвиях</label>
          </div>
        `;

        const bg = document.createElement('div');
        bg.className = 'item-background';
        bg.textContent = name;

        const overlay = document.createElement('div');
        overlay.className = 'item-img';

        bg.appendChild(overlay);
        item.appendChild(bg);

        item.addEventListener('click', () => {
          const encoded = encodeURIComponent(name);
          window.location.href = `varzia_details.html?name=${encoded}`;
        });

        container.appendChild(item);

        registerLazyCard(item, [
          `../img/frame/${name}.png`,
          `../img/weapon/${name}.png`
        ], PLACEHOLDER);
      });
    };

    // Инициализация
    renderPrimes();

    // Поиск
    searchInput.addEventListener('input', () => {
      renderPrimes(searchInput.value);
    });

  } catch (err) {
    container.innerText = 'Ошибка загрузки данных.';
    console.error(err);
  }
}
});
//Vazar timer/////////////////////////////////////////////////////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
  const timerElem = document.getElementById('content_varzia');
  console.log('timerElem:', timerElem);

 
  

  const DURATION_DAYS = 30;

  async function startTimer() {
    try {
      console.log('Запрос last_update.json');
      const response = await fetch('../public/last_update.json'); 
      const data = await response.json();

     
      const dateStr = data.date.trim();
      const parts = dateStr.split('-');
      if (parts.length !== 3) throw new Error('Неверный формат даты');

      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // месяцы с 0
      const day = parseInt(parts[2], 10);

      const lastUpdateDate = new Date(year, month, day);
      if (isNaN(lastUpdateDate)) {
        throw new Error('Дата некорректна');
      }

      const endDate = new Date(lastUpdateDate.getTime() + DURATION_DAYS * 24 * 60 * 60 * 1000);

      function updateTimer() {
        const now = new Date();
        const diffMs = endDate - now;
        

        if (diffMs <= 0) {
          timerElem.textContent = "Вазария — срок 30 дней истёк";
          clearInterval(intervalId);
          return;
        }

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

        timerElem.textContent = `Вазария ещё  ${days}д,  ${hours}ч,  ${minutes}м`;
      }

      updateTimer();
      const intervalId = setInterval(updateTimer, 60000);
    } catch (e) {
      console.error(e);
      timerElem.textContent = "Ошибка загрузки даты";
    }
  }

  startTimer();
});