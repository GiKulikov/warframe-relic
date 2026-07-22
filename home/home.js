import { currentLang, dict, loadLang, applyGeneralLang } from '../lang/lang.js';
import { loadPage, BASE } from '../loadPage.js';
export async function init() {
  applyGeneralLang(dict, document.getElementById('content'));
  const imageUrlCache = new Map();
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const [framesData, weaponsData] = await Promise.all([
    fetch(`${BASE}data/frames.json`).then(r => r.json()),
    fetch(`${BASE}data/weapons.json`).then(r => r.json())
  ]);
  function Isitem(name) {
    const isFrame = framesData.frames?.includes(name) || framesData.sentinels?.includes(name);
    const isWeapon = weaponsData.weapons?.includes(name);
    if (isFrame) return `${BASE}img/frame/${name}.png`;
    if (isWeapon) return `${BASE}img/weapon/${name}.png`;
    return null;
  }
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



  // Установка даты
  const dateElem = document.getElementById('date');
  try {
    const res = await fetch(`${BASE}data/last_update.json`);
    const data = await res.json();
    if (dateElem) dateElem.textContent = `${dict.general.common.date_update} ${data.date}`;
  } catch (err) {
    if (dateElem) dateElem.textContent = `${dict.general.common.loading}`;
  }

  // Таймер Варзии
  const timerElem = document.getElementById('columinfo-content_varzia');
  if (timerElem) {
    try {
      const response = await fetch(`${BASE}data/varziaRelic.json`);
      const data = await response.json();
      const varziaPeriod = data.varziaPeriod;

      const endDate = new Date(varziaPeriod.endDate)


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
  }
  const res1 = await fetch(`${BASE}data/VisibleContent.json`);
  const visibleContent = await res1.json();

  const relicGrid = document.getElementById('GridForRelic');
  if (visibleContent.status === false) {
    relicGrid.innerText = dict.general.common.data_not_updated;

  }
  else {
    // Загрузка реликвий
    const relicGrid = document.getElementById("GridForRelic");

    if (relicGrid) {
      try {
        const res = await fetch(`${BASE}data/relics.json`);
        const relicsData = await res.json();

        const groupByTier = relics =>
          relics.reduce((acc, relic) => {
            const tier = relic.split(" ")[0];
            (acc[tier] ??= []).push(relic);
            return acc;
          }, {});

        const newByTier = groupByTier(relicsData.added || []);
        const oldByTier = groupByTier(relicsData.current || []);

        const desiredTiers = ["Lith", "Meso", "Neo", "Axi"];

        const newRelics = desiredTiers
          .map(tier => {
            const list = newByTier[tier] || [];
            return list[Math.floor(Math.random() * list.length)] || null;
          })
          .filter(Boolean);

        const usedTiers = newRelics.map(r => r.split(" ")[0]);

        const remainingTiers = desiredTiers.filter(
          tier => !usedTiers.includes(tier)
        );

        const oldRelicsByType = remainingTiers
          .map(tier => {
            const list = oldByTier[tier] || [];
            return list[Math.floor(Math.random() * list.length)] || null;
          })
          .filter(Boolean);

        let selectedRelics = [...newRelics, ...oldRelicsByType];
        let usedNames = [...selectedRelics];

        let needed = 8 - selectedRelics.length;

        while (needed > 0) {
          for (const tier of desiredTiers) {
            if (needed <= 0) break;

            const available = (oldByTier[tier] || []).filter(
              relic => !usedNames.includes(relic)
            );

            if (available.length) {
              const relic =
                available[Math.floor(Math.random() * available.length)];

              selectedRelics.push(relic);
              usedNames.push(relic);
              needed--;
            }
          }
        }

        selectedRelics = selectedRelics.slice(0, 8);

        relicGrid.innerHTML = "";

        selectedRelics.forEach((relic, i) => {
          const tier = relic.split(" ")[0];

          const item = document.createElement("div");
          item.className = "grid-item";

          item.innerHTML = `
        <div class="description-card">
          ${i < newRelics.length ? '<label class="new-badge">NEW</label>' : ""}
          <label class="name-card">${relic}</label>
          <label class="addition">${tier} Relic</label>
        </div>
      `;

          if (i < newRelics.length)
            item.classList.add("new");
          const spans = {
            Lith: 16,
            Meso: 18,
            Neo: 20,
            Axi: 20
          };

          item.style.setProperty("--span", spans[tier]);


          const bg = document.createElement("div");
          bg.className = "item-background";
          bg.textContent = relic;

          const overlay = document.createElement("div");
          overlay.className = "item-img";

          bg.appendChild(overlay);
          item.appendChild(bg);

          item.addEventListener("click", () => {
            window.open(`https://wiki.warframe.com/w/${relic}`, "_blank");
          });

          relicGrid.appendChild(item);

          registerLazyCard(
            item,
            [`${BASE}img/relic/${tier}.png`],
            PLACEHOLDER
          );
        });
      } catch (err) {
        console.error(err);
      }
    }

    // Загрузка прайм-частей///////////////////////////////////////////////////////////////////////////////
    const primeGrid = document.getElementById('GridForPrime');
    if (primeGrid) {
      try {
        const res = await fetch(`${BASE}data/primes.json`);
        const primes = await res.json();




        const newPrimes = Object.entries(primes.added).filter(([name]) => {
          return !(name in primes.current) && !(name in primes.removed);
        }).slice(0, 4);

        const oldPrimes = Object.entries(primes.current)
          .sort(([, a], [, b]) => b.length - a.length);


        const selectedPrimes = [
          ...newPrimes,
          ...oldPrimes.slice(0, 9 - newPrimes.length)
        ].slice(0, 8);

        function getPrimePartType(name, item) {
          if (!name || !item) return null;
          let part = item;
          part = part.replace(name, '').trim();
          part = part.replace(/Blueprint$/i, '').trim();
          return part || 'Blueprint';
        }

        primeGrid.innerHTML = '';

        selectedPrimes.forEach(([name, parts], i) => {
          const item = document.createElement('div');
          // подсчёт уникальных частей прайм-объекта
          const currentParts = primes.current[name] || [];
          const addedParts = primes.added[name] || [];
          const removedParts = primes.removed[name] || [];
          const allParts = [...currentParts, ...addedParts];

          const frameParts = new Set();

          allParts.forEach(p => {
            const type = getPrimePartType(name, p.item);
            if (type) frameParts.add(type);
          });

          const frameCount = frameParts.size;

          // определение статусов


          let boolNew = false;
          let boolupdate = false;
          if (primes.current[name] === undefined && primes.removed[name] === undefined) {
            boolNew = true;

          } else if (primes.current[name] !== undefined && primes.added[name] !== undefined || primes.removed[name] !== undefined) {
            boolupdate = true;
          }
          const isFrameEntity = framesData.frames?.includes(name) || framesData.sentinels?.includes(name);


          const displayName = isFrameEntity
            ? (dict.frame.name_frame[name] ?? name)
            : (dict.weapon.name_weapon[name] ?? name);
          let part;
          if (currentLang === 'ru') {
            part = frameCount < 5 ? 'части' : 'частей';
          } else {
            part = frameCount < 5 ? 'parts' : 'parts';
          }
          item.className = 'grid-item';
          item.innerHTML = `
       <div class="description-card">

          <label class="name-card">${displayName}</label>
          <label class="addition">${frameCount} ${part}</label>
          ${boolNew ? '<label class="new-badge">NEW</label>' : boolupdate ? '<label class="new-badge">UPDATED</label>' : ''}

        </div>

        `;
          if (i < newPrimes.length) item.classList.add('new');
          if (isFrameEntity) {
            item.style.setProperty('--span', randomInt(30, 35));
          }
          else {
            item.style.setProperty('--span', randomInt(10, 20));

          }



          const bg = document.createElement('div');
          bg.className = 'item-background';
          bg.textContent = displayName;


          const overlay = document.createElement('div');
          overlay.className = 'item-img';


          bg.appendChild(overlay);
          item.appendChild(bg);

          item.addEventListener('click', () => {
            sessionStorage.setItem('selectedPrime', name);
            loadPage('path_prime/prime_details');


            window.location.hash = `#/path_prime/prime_details`;
          });

          primeGrid.appendChild(item);

          registerLazyCard(item, [
            Isitem(name)
          ], PLACEHOLDER);
        });

      } catch (err) {
        console.error(err);
      }

    }
  }


  // Загрузка данных Варзии................................................................................

  const varziaGrid = document.getElementById('GridForVarzia');
  if (varziaGrid) {
    try {
      const res = await fetch(`${BASE}data/varziaRelic.json`);
      const events = await res.json();

      if (events.status === 'NotUpdated') {
        varziaGrid.innerText = dict.general.common.data_not_updated;
        return;
      }


      const top8 = Object.entries(events)
        .filter(([key]) => key !== 'status' && key !== 'varziaPeriod')
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 8);

      varziaGrid.innerHTML = '';

      top8.forEach(([name, parts], i) => {
        const item = document.createElement('div');


        function getPrimePartType(name, item) {
          if (!name || !item) return null;
          let part = item;
          part = part.replace(name, '').trim();
          part = part.replace(/Blueprint$/i, '').trim();
          return part || 'Blueprint';
        }
        const frameParts = new Set();
        parts.forEach(p => {
          const type = getPrimePartType(name, p.item);
          if (type) frameParts.add(type);
        });
        const frameCount = frameParts.size;


        const isFrameEntity = framesData.frames?.includes(name) || framesData.sentinels?.includes(name);
        const displayName = isFrameEntity
          ? (dict.frame.name_frame[name] ?? name)
          : (dict.weapon.name_weapon[name] ?? name);
        let part;
        if (currentLang === 'ru') {
          part = frameCount < 5 ? 'части' : 'частей';
        } else {
          part = frameCount < 5 ? 'parts' : 'parts';
        }
        item.className = 'grid-item';
        item.innerHTML = `
        <div class="description-card">
          <label class="name-card">${displayName}</label>
          <label class="addition">${frameCount} ${part}</label>
        </div>
      `;
        if (isFrameEntity) {
          item.style.setProperty('--span', randomInt(30, 35));
        }
        else {
          item.style.setProperty('--span', randomInt(10, 20));

        }

        const bg = document.createElement('div');
        bg.className = 'item-background';
        bg.textContent = displayName;

        const overlay = document.createElement('div');
        overlay.className = 'item-img';

        bg.appendChild(overlay);
        item.appendChild(bg);

        item.addEventListener('click', () => {
          sessionStorage.setItem('selectedPrime', name);
          loadPage('path_varzia_relic/varzia_details');


          window.location.hash = `#/path_varzia_relic/varzia_details`;
        });
        varziaGrid.appendChild(item);

        registerLazyCard(item, [
          Isitem(name)
        ], PLACEHOLDER);
      });
    } catch (err) {
      console.error(err);
    }
  }


  return {
    destroy() {
      document.removeEventListener('click', onClick);
    }
  }
}