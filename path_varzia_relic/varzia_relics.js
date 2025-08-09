document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('primesContainer');
  const searchInput = document.getElementById('searchInput');
  const dateElem = document.getElementById('date');

  container.innerText = 'Загрузка данных...';

  let primes = {};

  try {
    const res = await fetch('../public/eventRelic.json');
    primes = await res.json();
  } catch (err) {
    container.innerText = 'Ошибка загрузки данных.';
    console.error(err);
    return;
  }

  // Проверяем, существует ли картинка по url, учитывая пробелы (например, "Ash Prime.png")
  function resolveImage(primaryUrl, fallbackUrl) {
    return new Promise((resolve) => {
      const testImg = new Image();
      testImg.onload = () => resolve(primaryUrl);
      testImg.onerror = () => {
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackUrl);
        fallbackImg.onerror = () => resolve(''); // Нет картинки
        fallbackImg.src = fallbackUrl;
      };
      testImg.src = primaryUrl;
    });
  }

  const renderPrimes = async (filter = '') => {
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

      // Формируем пути с пробелами, учитывая регистр букв
      const framePath = `../img/frame/${name}.png`;
      const weaponPath = `../img/weapon/${name}.png`;

      const imageUrl = await resolveImage(framePath, weaponPath);

      card.innerHTML = `
        <div class="grid-background" style="background-image: url('${imageUrl}')">
          <div class="blur-overlay">
            <div class="prime-title">${name}</div>
            <div class="prime-details">${parts.length} частей в актуальных реликвиях</div>
          </div>
        </div>
      `;
       const bg = card.querySelector('.grid-background');
if (bg) {
  bg.style.backgroundPosition = 'top center';  // можно оставить, чтобы картинка сверху была
  bg.style.backgroundSize = 'contain'; // вот эта строка меняет поведение
  bg.style.backgroundRepeat = 'no-repeat'; // чтобы не было повторов
}


      card.onclick = () => {
        const encoded = encodeURIComponent(name);
        window.location.href = `varzia_details.html?name=${encoded}`;
      };

      container.appendChild(card);
    }
  };

  // Изначальный рендер
  renderPrimes();

  // Обработчик поиска
  searchInput.addEventListener('input', () => {
    const query = searchInput.value;
    renderPrimes(query);
  });


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
