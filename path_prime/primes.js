document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('primesContainer');
  const searchInput = document.getElementById('searchInput');
  const dateElem = document.getElementById('date');
  container.innerText = 'Загрузка данных...';
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
  const placeholder = '../img/placeholder.jpg';
  const imageCache = {};
  async function resolveImage(primaryUrl, fallbackUrl) {
    const cacheKey = primaryUrl + '|' + fallbackUrl;
    if (imageCache[cacheKey]) return imageCache[cacheKey];
    return new Promise((resolve) => {
      const testImg = new Image();
      testImg.onload = () => { imageCache[cacheKey] = primaryUrl; resolve(primaryUrl); };
      testImg.onerror = () => {
        if (!fallbackUrl) { imageCache[cacheKey] = ''; resolve(''); return; }
        const fallbackImg = new Image();
        fallbackImg.onload = () => { imageCache[cacheKey] = fallbackUrl; resolve(fallbackUrl); };
        fallbackImg.onerror = () => { imageCache[cacheKey] = ''; resolve(''); };
        fallbackImg.src = fallbackUrl;
      };
      testImg.src = primaryUrl;
    });
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      const name = card.dataset.name;
      const bgDiv = card.querySelector('.grid-background');
      const framePath = `../img/frame/${name}.png`;
      const weaponPath = `../img/weapon/${name}.png`;
      const imgPath = await resolveImage(framePath, weaponPath);
      bgDiv.style.backgroundImage = `url('${imgPath || placeholder}')`;
      observer.unobserve(card);
    });
  }, { threshold: 0.1 });
  const renderPrimes = (filter = '') => {
    container.innerHTML = '';
    // Все имена праймов из current + added
    const namesSet = new Set([
      ...Object.keys(primes.current || {}),
      ...Object.keys(primes.added || {})
    ]);
    const entries = Array.from(namesSet)
      .filter(name => {
        const lowerFilter = filter.toLowerCase().trim();
        // Проверяем совпадение с названием прайма
        if (name.toLowerCase().includes(lowerFilter)) return true;
        // Получаем реликвии для текущего прайма из primes.json
        const partsObj = {
          current: primes.current[name] || [],
          added: primes.added[name] || []
        };
        // Объединяем все реликвии
        const allRelics = [...partsObj.current, ...partsObj.added];
        // Проверяем, есть ли совпадение с названием реликвии в поле relic
        return allRelics.some(relicObj => {
          // Проверяем поле relic в объекте
          return relicObj.relic && typeof relicObj.relic === 'string' && relicObj.relic.toLowerCase().includes(lowerFilter);
        });
      })
      .map(name => [name, {
        current: primes.current[name] || [],
        added: primes.added[name] || []
      }]);
    if (!entries.length) {
      container.innerHTML = '<p>Ничего не найдено.</p>';
      return;
    }
    for (const [name, partsObj] of entries) {
      const card = document.createElement('div');
      card.className = 'prime-card';
      card.dataset.name = name;
      const bgDiv = document.createElement('div');
      bgDiv.className = 'grid-background';
      bgDiv.style.backgroundImage = `url('${placeholder}')`;
      bgDiv.style.backgroundPosition = 'top center';
      bgDiv.style.backgroundSize = 'contain';
      bgDiv.style.backgroundRepeat = 'no-repeat';
      const overlay = document.createElement('div');
      overlay.className = 'blur-overlay';
      // Подсчёт частей
      const currentCount = (partsObj.current || []).length;
      const addedCount = (partsObj.added || []).length;
      const partsCount = currentCount + addedCount;
      const hasNew = addedCount > 0;
      overlay.innerHTML = `
        <div class="prime-title">${name}</div>
        <div class="prime-details">
          ${partsCount} частей в актуальных реликвиях
          ${hasNew ? '<span class="new-badge">New</span>' : ''}
        </div>
      `;
      bgDiv.appendChild(overlay);
      card.appendChild(bgDiv);
      card.onclick = () => {
        const encoded = encodeURIComponent(name);
        window.location.href = `prime_details.html?name=${encoded}`;
      };
      container.appendChild(card);
      observer.observe(card);
    }
  };
  renderPrimes();
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    renderPrimes(q);
  });
  try {
    const res = await fetch('../public/last_update.json');
    if (!res.ok) throw new Error('Не удалось загрузить last_update.json');
    const data = await res.json();
    if (dateElem) {
      dateElem.textContent = `Дата обновления: ${data.date}`;
    }
  } catch (err) {
    console.error('Ошибка при получении даты:', err);
    if (dateElem) dateElem.textContent = 'Дата обновления: неизвестна';
  }
});