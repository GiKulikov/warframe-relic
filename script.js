document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#relicTable tbody');
  const filterSelect = document.getElementById('typeFilter');

  // Загружаем дату
  document.getElementById('date').textContent = `Дата обновления: ${new Date().toLocaleDateString()}`;

  const relics = await fetchRelics();

  // Фильтрация по типу
  filterSelect.addEventListener('change', () => render(relics));

  function render(data) {
    const filter = filterSelect.value;
    tableBody.innerHTML = ''; // очищаем

    data.forEach(relic => {
      if (filter !== 'all' && relic.tier !== filter) return;

      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${relic.name}</td>
        
        <td>
          <a href="https://warframe.market/ru/items/${relic.slug}/dropsources" target="_blank">
            <button>Открыть</button>
          </a>
        </td>
        
      `;

      tableBody.appendChild(row);
    });
  }

  async function fetchRelics() {
    const res = await fetch('https://corsproxy.io/?https://kusobako.github.io/warframe/available-relics');
    const text = await res.text();
    const dom = new DOMParser().parseFromString(text, 'text/html');
    const sections = dom.querySelectorAll('section.relics__list');

    const relics = [];

    sections.forEach(section => {
      const tier = section.querySelector('h2')?.textContent.trim();
      const names = section.querySelectorAll('p');

      names.forEach(p => {
        const name = p.textContent.trim();
        relics.push({
          name: name,
          tier: tier,
          slug: name.toLowerCase().replace(/\s+/g, '_') + '_relic'
        });
      });
    });

    render(relics);
    return relics;
  }
});
