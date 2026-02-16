import { currentLang,dict, loadLang, applyGeneralLang } from '../lang/lang.js';
import { loadPage,BASE } from '../loadPage.js';
const res = await fetch(`${BASE}data/frames.json`);
const frames = await res.json();
export async  function init() {
    applyGeneralLang(dict, document.getElementById('content'));
    const imageUrlCache = new Map();

        async function loadFirstAvailable(urls) {
      for (const url of urls) {

        if (imageUrlCache.has(url)) {
          const cached = imageUrlCache.get(url);
          if (cached) return cached;
          continue;
        }

        const result = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(url);
          img.onerror = () => resolve(null);
          img.src = url;
        });

        imageUrlCache.set(url, result);

        if (result) return result;
      }

      return '';
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
  bg.style.backgroundImage = `url('${placeholder}')`;
  bg.style.backgroundPosition = 'top center';
  bg.style.backgroundSize = 'contain';
  bg.style.backgroundRepeat = 'no-repeat';

  __lazyCards.set(card, { urls, placeholder });
  __io.observe(card);
}

const PLACEHOLDER = `${BASE}img/placeholder.png`;

  const container = document.getElementById('primesContainer');
  const searchInput = document.getElementById('searchInput');
  const dateElem = document.getElementById('date');

  

  // Загрузка данных 
 if (container) {
  try {
    const res = await fetch(`${BASE}data/eventRelic.json`);
    if (!res.ok) throw new Error(`${res.status}`);
    const primes = await res.json();

    if (primes.status === 'NotUpdated') {
      container.innerText = dict.general.common.data_not_updated;
      return;
    }

    function getPrimePartType(name, item) {
      if (!name || !item) return null;
      let part = item;
      part = part.replace(name, '').trim();
      part = part.replace(/Blueprint$/i, '').trim();
      return part || 'Blueprint';
    }

    const renderPrimes = (filter = '') => {
      container.innerHTML = '';
      const lowerFilter = filter.toLowerCase().trim();

      const entries = Object.entries(primes)
        .filter(([name]) => name !== 'status' && name !== 'varziaPeriod')
        .filter(([name, parts]) => {
          if (!lowerFilter) return true;

          const en = name.toLowerCase();
          const ru =
            dict.frame?.name_frame?.[name]?.toLowerCase() ||
            dict.weapon?.name_weapon?.[name]?.toLowerCase() ||
            '';

          return (
            en.includes(lowerFilter) ||
            ru.includes(lowerFilter) ||
            parts.some(p => p.relic?.toLowerCase().includes(lowerFilter))
          );
        });

      if (!entries.length) return;

      entries.forEach(([name, parts]) => {

        const frameParts = new Set();
        parts.forEach(p => {
          const type = getPrimePartType(name, p.item);
          if (type) frameParts.add(type);
        });
        const frameCount = frameParts.size;

        const isWarframe = frames.frames.includes(name);
        const displayName = isWarframe
          ? (dict.frame.name_frame[name] ?? name)
          : (dict.weapon.name_weapon[name] ?? name);

        let part;
        if (currentLang === 'ru') {
          part = frameCount < 5 ? 'части' : 'частей';
        } else {
          part = 'parts';
        }

        const item = document.createElement('div');
        item.className = 'grid-item';

        item.innerHTML = `
          <div class="description-card">
            <label class="name-card">${displayName}</label>
            <label class="addition">
              ${frameCount} ${part} ${dict.general.item.card_description}
            </label>
          </div>
        `;

        const bg = document.createElement('div');
        bg.className = 'item-background';
        bg.textContent = name;

        const overlay = document.createElement('div');
        overlay.className = 'item-img';

        bg.appendChild(overlay);
        item.appendChild(bg);

        item.addEventListener('click', () => {
          sessionStorage.setItem('selectedPrime', name);
          loadPage('path_varzia_relic/varzia_details');
          window.location.hash = `#/path_varzia_relic/varzia_details`;
        });

        container.appendChild(item);

        registerLazyCard(item, [
          `${BASE}img/frame/${name}.png`,
          `${BASE}img/weapon/${name}.png`
        ], PLACEHOLDER);
      });
    };

    renderPrimes();

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderPrimes(searchInput.value);
      });
    }

  } catch (err) {
    console.error(err);
  }
}

//Vazar timer/////////////////////////////////////////////////////////////////////////////////////////////////////
  const timerElem = document.getElementById('content_varzia');
  
  if (timerElem) {
    (async () => {
      try {
        const response = await fetch(`${BASE}data/eventRelic.json`);
        const data = await response.json();
        
        const varziaPeriod = data.varziaPeriod;
        if (!Array.isArray(varziaPeriod) || varziaPeriod.length === 0) {
          throw new Error('Invalid varziaPeriod data');
        }
        
        const endDateStr = varziaPeriod[0].endDate;
        const endDate = new Date(endDateStr);
        
        

        function updateTimer() {
          const now = new Date();
          const diffMs = endDate - now;

          if (diffMs <= 0) {
            clearInterval(intervalId);
            return;
          }

          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

          
      timerElem.textContent = ` ${dict.general.home.columinfo_content_varzia} ${days}${dict.general.time.days},  ${hours}${dict.general.time.hours},   ${minutes}${dict.general.time.minutes}`;
 
        }

        updateTimer();
        const intervalId = setInterval(updateTimer, 60000);

      } catch (e) {
        console.error(e);
      }
    })();
  }

     return {
    destroy() {
      document.removeEventListener('click', onClick);
    }
  }
}