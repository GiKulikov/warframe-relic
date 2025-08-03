document.addEventListener('DOMContentLoaded', async () => {
  const relicGrid = document.getElementById('relicGrid');
  const filterSelect = document.getElementById('typeFilter');

  // Установка даты
  document.getElementById('date').textContent = `Дата обновления: ${new Date().toLocaleDateString()}`;

  const relics = await fetchRelics();

  // Обработчик фильтрации
  filterSelect.addEventListener('change', () => render(relics));

  function render(data) {
    const filter = filterSelect.value;
    relicGrid.innerHTML = ''; // очищаем

    data.forEach(relic => {
      if (filter !== 'all' && relic.tier !== filter) return;

      const card = document.createElement('div');
      card.className = 'relic-card';

      card.innerHTML = `
        <div class="relic-title">${relic.name}</div>
        <div class="relic-tier">${relic.tier} Relic</div>
        <div class="relic-link">
          <a class="market-link" href="https://warframe.market/ru/items/${relic.slug}/dropsources" target="_blank">
            Открыть
          </a>
        </div>
      `;

      relicGrid.appendChild(card);
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
      section.querySelectorAll('p').forEach(p => {
        const name = p.textContent.trim();
        relics.push({
          name,
          tier,
          slug: name.toLowerCase().replace(/\s+/g, '_') + '_relic'
        });
      });
    });

    render(relics);
    return relics;
  }
});


//iframe loading function
function loadIframe(url) {
      const frame = document.getElementById("pageFrame");
      
      frame.src = url;
    }
    const iframe = document.getElementById('pageFrame');
    const header = document.querySelector('header'); 

    function updateIframeHeight() {
      const headerHeight = header.offsetHeight;
      iframe.style.height = `calc(100vh - ${headerHeight}px)`;
      iframe.style.width = '100%'; 
    }


    updateIframeHeight();