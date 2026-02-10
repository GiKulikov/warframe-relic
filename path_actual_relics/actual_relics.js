import { currentLang,dict, loadLang, applyGeneralLang } from '../lang/lang.js';
import { loadPage } from '../loadPage.js';
const res = await fetch('../data/frames.json');
const frames = await res.json();
export async  function init() {
    applyGeneralLang(dict, document.getElementById('content'));

const PLACEHOLDER = '../img/placeholder.png';
let uniqueRelics = [];

async function loadFirstAvailable(urls) {
  for (const url of urls) {
    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => reject(false);
        img.src = url;
      });
      return url;
    } catch {
      continue;
    }
  }
  return PLACEHOLDER;
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
  if (!bg) return;

  bg.style.backgroundImage = `url('${placeholder}')`;
  bg.style.backgroundPosition = 'top center';
  bg.style.backgroundSize = 'contain';
  bg.style.backgroundRepeat = 'no-repeat';

  __lazyCards.set(card, { urls, placeholder });
  __io.observe(card);
}

function renderRelics(filterType, newRelicNames, relicGrid) {
  if (!relicGrid) return;
  relicGrid.innerHTML = '';

  const filteredRelics = filterType === 'all'
    ? uniqueRelics
    : uniqueRelics.filter(r => r.tier === filterType);

  filteredRelics.forEach((relic) => {
    if (!relic) return;

    const item = document.createElement('div');
    item.className = 'grid-item';
    item.innerHTML = `
      <div class="description-card">
        <label class="name-card">${relic.name}</label>
        <label class="addition">${relic.tier} Relic</label>
        ${newRelicNames.has(relic.name) ? '<label class="new-badge">NEW</label>' : ''}
      </div>
    `;

    const bg = document.createElement('div');
    bg.className = 'item-background';
    bg.textContent = relic.name;

    const overlay = document.createElement('div');
    overlay.className = 'item-img';

    bg.appendChild(overlay);
    item.appendChild(bg);

    item.addEventListener('click', () => {
      window.open(`https://wiki.warframe.com/w/${relic.name}`, '_blank');
    });

    relicGrid.appendChild(item);
    registerLazyCard(item, [`../img/relic/${relic.tier}.png`], PLACEHOLDER);
  });

 
}

  const relicGrid = document.getElementById('relicGrid');
  const typeFilter = document.getElementById('typeFilter');
  const dateElem = document.getElementById('date');

  try {
    const res = await fetch('../data/last_update.json');
    const data = await res.json();
    if (dateElem) dateElem.textContent = `${dict.general.common.date_update}: ${data.date }`;
  } catch (err) {
    console.error( err);
    if (dateElem) dateElem.textContent = `${dict.general.common.loading}`;
  }

  try {
        const res1 = await fetch('../data/VisibleContent.json');
        const visibleContent = await res1.json();

        if (visibleContent.status === false || visibleContent.status === 'false') {
        if (relicGrid) relicGrid.innerText = `${dict.general.common.data_not_updated}`;
        } else {
        // Загружаем реликвии
      if (relicGrid) {
        try {
          const res = await fetch('../data/relics.json');
          const relicsData = await res.json();

          const allRelics = [...(relicsData.added || []), ...(relicsData.current || [])];
          const newRelicNames = new Set((relicsData.added || []).map(r => r.name));

          const usedNames = new Set();
          uniqueRelics = allRelics.filter(r => {
            if (!usedNames.has(r.name)) {
              usedNames.add(r.name);
              return true;
            }
            return false;
          });

          renderRelics('all', newRelicNames, relicGrid);

          if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
              renderRelics(e.target.value, newRelicNames, relicGrid);
            });
          }

        } catch (err) {
          console.error(err);
        }
      }
    }
  } catch (err) {
    console.error( err);
  }



     return {
    destroy() {
      document.removeEventListener('click', onClick);
    }
  }
}