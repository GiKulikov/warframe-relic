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

  const placeholder = '../img/placeholder.png';

  // Проверка доступности изображения
  function resolveImage(primaryUrl, fallbackUrl) {
    return new Promise((resolve) => {
      const testImg = new Image();
      testImg.onload = () => resolve(primaryUrl);
      testImg.onerror = () => {
        if (!fallbackUrl) {
          resolve('');
          return;
        }
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackUrl);
        fallbackImg.onerror = () => resolve('');
        fallbackImg.src = fallbackUrl;
      };
      testImg.src = primaryUrl;
    });
  }

  // Наблюдатель для ленивой загрузки
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        const card = entry.target;
        const name = card.dataset.name;
        const bgDiv = card.querySelector('.grid-background');

        // Пути к картинкам
        const framePath = `../img/frame/${name}.png`;
        const weaponPath = `../img/weapon/${name}.png`;

        // Ждём доступное изображение
        const imgPath = await resolveImage(framePath, weaponPath);

        // Устанавливаем фон
        bgDiv.style.backgroundImage = `url('${imgPath || placeholder}')`;

        observer.unobserve(card); // перестаём следить за карточкой
      }
    });
  }, { threshold: 0.1 });

  const renderPrimes = (filter = '') => {
    container.innerHTML = '';

    const entries = Object.entries(primes).filter(([name]) =>
      name.toLowerCase().includes(filter.toLowerCase())
    );

    if (entries.length === 0) {
      container.innerHTML = '<p>Ничего не найдено.</p>';
      return;
    }

    for (const [name, parts] of entries) {
      const card = document.createElement('div');
      card.className = 'prime-card';
      card.dataset.name = name; // сохраняем имя для lazy load

      // Фоновое изображение (пока placeholder)
      const bgDiv = document.createElement('div');
      bgDiv.className = 'grid-background';
      bgDiv.style.backgroundImage = `url('${placeholder}')`;
      bgDiv.style.backgroundPosition = 'top center';
      bgDiv.style.backgroundSize = 'contain';
      bgDiv.style.backgroundRepeat = 'no-repeat';

      // Оверлей с текстом
      const overlay = document.createElement('div');
      overlay.className = 'blur-overlay';
      overlay.innerHTML = `
        <div class="prime-title">${name}</div>
        <div class="prime-details">${parts.length} частей в актуальных реликвиях</div>
      `;

      bgDiv.appendChild(overlay);
      card.appendChild(bgDiv);

      card.onclick = () => {
        const encoded = encodeURIComponent(name);
        window.location.href = `prime_details.html?name=${encoded}`;
      };

      container.appendChild(card);

      // Подключаем ленивую загрузку для карточки
      observer.observe(card);
    }
  };

  renderPrimes();

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    renderPrimes(q);
  });

  // Загрузка даты обновления
  try {
    const res = await fetch('../public/last_update.json');
    if (!res.ok) throw new Error('Не удалось загрузить last_update.json');

    const data = await res.json();
    if (dateElem) {
      dateElem.textContent = `Дата обновления: ${data.date}`;
    }
  } catch (err) {
    console.error('Ошибка при получении даты:', err);
    if (dateElem) {
      dateElem.textContent = 'Дата обновления: неизвестна';
    }
  }
});
