document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('primesContainer');
    const searchInput = document.getElementById('searchInput');
    const dateElem = document.getElementById('date');

    container.innerText = 'Загрузка данных...';

    let primes = {};

    try {
      const res = await fetch('../public/primes.json');
      primes = await res.json();
    } catch (err) {
      container.innerText = 'Ошибка загрузки данных.';
      console.error(err);
      return;
    }

    // Показываем все карточки
    const renderPrimes = (filter = '') => {
      container.innerHTML = '';
      const entries = Object.entries(primes).filter(([name]) =>
        name.toLowerCase().includes(filter.toLowerCase())
      );

      if (entries.length === 0) {
        container.innerHTML = '<p>Ничего не найдено.</p>';
        return;
      }

      entries.forEach(([name, parts]) => {
        const card = document.createElement('div');
        card.className = 'prime-card';
        card.innerHTML = `
          <h2>${name}</h2>
          <p>${parts.length} частей в актуальных реликвиях</p>
        `;
        card.onclick = () => {
          const encoded = encodeURIComponent(name);
          window.location.href = `prime_details.html?name=${encoded}`;
        };
        container.appendChild(card);
      });
    };

    // Изначальный рендер
    renderPrimes();

    // Обработчик поиска
    searchInput.addEventListener('input', () => {
      const query = searchInput.value;
      renderPrimes(query);
    });

    // Загрузка даты обновления
    try {
      const res = await fetch('../public/last_update.json');
      if (!res.ok) throw new Error('Не удалось загрузить last_update.json');

      const data = await res.json();
      dateElem.textContent = `Дата обновления: ${data.date}`;
    } catch (err) {
      console.error('Ошибка при получении даты:', err);
      dateElem.textContent = 'Дата обновления: неизвестна';
    }
  });