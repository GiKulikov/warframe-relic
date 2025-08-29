document.addEventListener('DOMContentLoaded', async () => {
  const frameName = new URLSearchParams(window.location.search).get('name');
  document.getElementById('frameTitle').innerText = frameName || 'Прайм персонаж или оружие';

  const res = await fetch('../public/primes.json');
  const rawPrimes = await res.json();

  // Объединяем current и added, сливая массивы для каждого ключа
  const primes = {};
  Object.keys(rawPrimes.current).forEach(key => {
    primes[key] = [...(rawPrimes.current[key] || [])];
  });
  Object.keys(rawPrimes.added).forEach(key => {
    if (primes[key]) {
      primes[key] = [...primes[key], ...(rawPrimes.added[key] || [])];
    } else {
      primes[key] = [...(rawPrimes.added[key] || [])];
    }
  });

  // Определяем, является ли объект варфреймом или оружием на основе большинства частей
  const warframeParts = ['Chassis', 'Neuroptics', 'Systems']; // Исключаем Blueprint из проверки
  const allParts = primes[frameName] || [];
  const partTypes = allParts.map(part => part.item.split(' ').pop());
  const warframeCount = partTypes.filter(p => warframeParts.includes(p)).length;
  const isWarframe = warframeCount > (partTypes.length - warframeCount); // Большинство - варфрейм-части

  // Фильтруем части: для варфреймов — только их части, для оружия — все части
  let parts = allParts.filter(part => {
    const partName = part.item.split(' ').pop();
    return isWarframe
      ? ['Blueprint', 'Chassis', 'Neuroptics', 'Systems'].includes(partName) // Для варфреймов
      : true; // Для оружия — все части, включая Blueprint
  });

  // Сортировка частей
  if (isWarframe) {
    // Определяем порядок для варфреймов: Blueprint, Chassis, Neuroptics, Systems
    const partOrder = ['Blueprint', 'Chassis', 'Neuroptics', 'Systems'];
    parts.sort((a, b) => {
      const partNameA = a.item.split(' ').pop();
      const partNameB = b.item.split(' ').pop();
      return partOrder.indexOf(partNameA) - partOrder.indexOf(partNameB);
    });
  } else {
    // Для оружия сортируем по алфавиту (или оставляем как есть, если не нужна сортировка)
    parts.sort((a, b) => a.item.localeCompare(b.item));
  }

  const container = document.getElementById('partsContainer');
  container.innerHTML = '';

  if (parts.length === 0) {
    container.innerHTML = '<p>Нет данных о частях этого прайм-объекта.</p>';
    return;
  }

  parts.forEach(({ item, relic }) => {
    const card = document.createElement('div');
    card.className = 'part-card';

    // Нормализуем имя предмета для warframe.market
    const marketSetSlug = item.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');
    const relicSlug = relic.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '') + '_relic';

    // Формируем название части для отображения
    const partDisplayName = item.replace(`${frameName} `, '');

    card.innerHTML = `
      <strong><span class="frame-name">${partDisplayName}</span></strong><br>
      Выпадает из реликвии: <b><span class="relic-name">${relic}</span></b><br><br>
      <button class="market-btn" onclick="window.open('https://warframe.market/items/${marketSetSlug}', '_blank')">
        Warframe Market
      </button>
      <button class="relic-btn" onclick="window.open('https://warframe.market/items/${relicSlug}/dropsources', '_blank')">
        Источник реликвии
      </button>
    `;

    const frameEl = card.querySelector('.frame-name');
    const relicEl = card.querySelector('.relic-name');

    card.querySelector('.market-btn').addEventListener('mouseenter', () => {
      frameEl.style.color = '#aa62ecff';
    });
    card.querySelector('.market-btn').addEventListener('mouseleave', () => {
      frameEl.style.color = '';
    });

    card.querySelector('.relic-btn').addEventListener('mouseenter', () => {
      relicEl.style.color = '#aa62ecff';
    });
    card.querySelector('.relic-btn').addEventListener('mouseleave', () => {
      relicEl.style.color = '';
    });

    container.appendChild(card);
  });
});