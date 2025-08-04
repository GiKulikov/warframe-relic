document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('primesContainer');
  container.innerText = 'Загрузка данных...';

  const res = await fetch('/public/primes.json');
  const primes = await res.json();

  container.innerHTML = '';
  Object.entries(primes).forEach(([name, parts]) => {
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
});
 // Установка даты
document.addEventListener('DOMContentLoaded', async () => {
  const dateElem = document.getElementById('date');

  try {
    const res = await fetch('/public/last_update.json');
    if (!res.ok) throw new Error('Не удалось загрузить last_update.json');

    const data = await res.json();
    dateElem.textContent = `Дата обновления: ${data.date}`;
  } catch (err) {
    console.error('❌ Ошибка при получении даты:', err);
    dateElem.textContent = 'Дата обновления: неизвестна';
  }
});
