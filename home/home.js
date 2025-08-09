// for relics
document.addEventListener('DOMContentLoaded', async () => {
  // Выпадающее меню (оставляем без изменений)
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
    const list = byTier[tier] || [];
    // тасуем
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    // добавляем первые два
    selected.push(...list.slice(0,2));
  });

  // Перемешиваем итоговый массив
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  // Рендерим
  selected.forEach((relic, i) => {
  const item = document.createElement('div');
  item.className = 'grid-item';
  const span = (i % 3 === 0) ? 25 : 20;
  item.style.setProperty('--span', span);

  // Контейнер с фоном
  const bg = document.createElement('div');
  bg.className = 'grid-background';
   bg.style.backgroundImage = `url('../img/relic/${relic.tier}.png')`; 
  
  // Оверлей
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
});
});
// for prime/////////////////////////////////////////////////////////////////////////////////////////////////

document.addEventListener('DOMContentLoaded', async () => {
  const primeGrid = document.getElementById('relicGrid2');
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
    const span = (i % 3 === 0) ? 25 : 20;
    item.style.setProperty('--span', span);

    // Создаём фон 
    const bg = document.createElement('div');
    bg.className = 'grid-background';
    bg.style.backgroundImage = `url('../img/frame/${name}.png')`;
    bg.style.backgroundPosition = 'top center';
      bg.style.backgroundSize = 'contain';
      bg.style.backgroundRepeat = 'no-repeat';



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
  });
});
// varzia relics///////////////////////////////////////////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', async () => {
  const varziaGrid = document.getElementById('relicGrid3');
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
  const span = (i % 3 === 0) ? 25 : 20;
  item.style.setProperty('--span', span);

    const bg = document.createElement('div');
    bg.className = 'grid-background';
    bg.style.backgroundPosition = 'center 20px';
    bg.style.backgroundRepeat = 'no-repeat';
  

    //  путь к изображению с fallback
    const framePath = `../img/frame/${name}.png`;
    const weaponPath = `../img/weapon/${name}.png`;

    const imageUrl = await resolveImage(framePath, weaponPath);
    bg.style.backgroundImage = `url('${imageUrl}')`;
     bg.style.backgroundPosition = 'top center';
      bg.style.backgroundSize = 'contain';
      bg.style.backgroundRepeat = 'no-repeat';

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
  }

  // Функция для проверки доступности изображения
  function resolveImage(primaryUrl, fallbackUrl) {
    return new Promise((resolve) => {
      const testImg = new Image();
      testImg.onload = () => resolve(primaryUrl);
      testImg.onerror = () => {
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackUrl);
        fallbackImg.onerror = () => resolve(''); 
        fallbackImg.src = fallbackUrl;
      };
      testImg.src = primaryUrl;
    });

    
  }
  
   
});
//Vazar timer/////////////////////////////////////////////////////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
  const timerElem = document.getElementById('columinfo-content_varzia');
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
      const month = parseInt(parts[1], 10) - 1; 
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

        timerElem.textContent = `Вазария  ${days}д,  ${hours}ч,   ${minutes}м`;
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
// Установка даты
document.addEventListener('DOMContentLoaded', async () => {
  const dateElem = document.getElementById('date');

  try {
    const res = await fetch('../public/last_update.json');
    if (!res.ok) throw new Error('Не удалось загрузить last_update.json');

    const data = await res.json();
    dateElem.textContent = `Дата обновления: ${data.date}`;
  } catch (err) {
    console.error('❌ Ошибка при получении даты:', err);
    dateElem.textContent = 'Дата обновления: неизвестна';
  }
});



