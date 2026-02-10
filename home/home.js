import { currentLang,dict, loadLang, applyGeneralLang } from '../lang/lang.js';
import { loadPage,BASE } from '../loadPage.js';
const res = await fetch(`${BASE}data/frames.json`);
const frames = await res.json();
export async  function init() {
  applyGeneralLang(dict, document.getElementById('content'));
function loadFirstAvailable(urls) {
  return new Promise((resolve) => {
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) return resolve('');
      const testImg = new Image();
      const url = urls[i++];
      testImg.onload = () => resolve(url);
      testImg.onerror = tryNext;
      testImg.src = url;
    };
    tryNext();
  });
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
    const response = await fetch(`${BASE}data/eventRelic.json`);
    const data = await response.json();
    const varziaPeriod = data.varziaPeriod;
    
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
}
      const res1 = await fetch(`${BASE}data/VisibleContent.json`);
      const visibleContent =await res1.json();
      
      const relicGrid = document.getElementById('relicGrid');
 if (visibleContent.status === false) {
      relicGrid.innerText = dict.general.common.data_not_updated;
      
  }
  else{
// Загрузка реликвий
    const relicGrid = document.getElementById('relicGrid');
    if (relicGrid) {
      try {
    const res = await fetch(`${BASE}data/relics.json`);
    const relicsData = await res.json();

    // Группируем реликвии по типам
    const newByTier = (relicsData.added || []).reduce((acc, r) => {
      acc[r.tier] = acc[r.tier] || [];
      acc[r.tier].push(r);
      return acc;
    }, {});
    const oldByTier = (relicsData.current || []).reduce((acc, r) => {
      acc[r.tier] = acc[r.tier] || [];
      acc[r.tier].push(r);
      return acc;
    }, {});

    const desiredTiers = ['Lith', 'Meso', 'Neo', 'Axi'];
    const newRelics = desiredTiers
      .map(tier => (newByTier[tier] || [])[Math.floor(Math.random() * (newByTier[tier] || []).length)] || null)
      .filter(r => r);

    const usedTiers = newRelics.map(r => r.tier);
    const remainingTiers = desiredTiers.filter(tier => !usedTiers.includes(tier));
    const oldRelicsByType = remainingTiers
      .map(tier => (oldByTier[tier] || [])[Math.floor(Math.random() * (oldByTier[tier] || []).length)] || null)
      .filter(r => r);

    let selectedRelics = [...newRelics, ...oldRelicsByType];
    let usedNames = selectedRelics.map(r => r.name);
    let needed = 8 - selectedRelics.length;

    while (needed > 0) {
      for (const tier of desiredTiers) {
        if (needed <= 0) break;
        const available = (oldByTier[tier] || []).filter(r => !usedNames.includes(r.name));
        if (available.length > 0) {
          const selected = available[Math.floor(Math.random() * available.length)];
          selectedRelics.push(selected);
          usedNames.push(selected.name);
          needed--;
        }
      }
    }

    selectedRelics = selectedRelics.slice(0, 8);

    relicGrid.innerHTML = '';

    selectedRelics.forEach((relic, i) => {
      if (!relic) return;
      const item = document.createElement('div');
      item.className = 'grid-item';
      item.innerHTML = `
        <div class="description-card">
        ${i < newRelics.length ? '<label class="new-badge">NEW</label>' : ''}
          <label class="name-card">${relic.name}</label>
          <label class="addition">${relic.tier} Relic</label>
          
        </div>
      `;
      if (i < newRelics.length) item.classList.add('new'); 
      item.style.setProperty('--span', (i % 3 === 0) ? 25 : 20);

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

      registerLazyCard(item, [`${BASE}img/relic/${relic.tier}.png`], PLACEHOLDER);
    });

    
  } catch (err) {
    console.error(err);
  }
}

  // Загрузка прайм-частей///////////////////////////////////////////////////////////////////////////////
  const primeGrid = document.getElementById('relicGrid2');
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
        const addedParts   = primes.added[name] || [];
        const removedParts = primes.removed[name] || [];
        const allParts     = [...currentParts, ...addedParts];

        const frameParts = new Set();

        allParts.forEach(p => {
          const type = getPrimePartType(name, p.item);
          if (type) frameParts.add(type);
        });
        
        const frameCount = frameParts.size;
        
         // определение статусов
        const inCurr = addedParts.filter(added =>
          currentParts.some(current => current.item === added.item)
        );
        

        let boolNew = false;
        let boolupdate = false;
        if(inCurr.length===0 && addedParts.length>0 && removedParts.length===0){
          boolNew = true;
        }
        else if(removedParts.length>0 &&addedParts.length>0){
          boolupdate = true;
        }
        const isWarframe = frames.frames.includes(name);
               
        const displayName = isWarframe
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
          ${boolNew ? '<label class="new-badge">NEW</label>' :  boolupdate ?'<label class="new-badge">UPDATED</label>' :''}

        </div>

        `;
        if (i < newPrimes.length) item.classList.add('new');
        item.style.setProperty('--span', (i % 3 === 0) ? 25 : 20);

        const bg = document.createElement('div');
        bg.className = 'item-background';
        bg.textContent = name; 
        

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
          `${BASE}img/frame/${name}.png`,
          `${BASE}img/weapon/${name}.png`
        ], PLACEHOLDER);
      });

    } catch (err) {
      console.error(err);
    }
    
  }
}
  

  // Загрузка данных Варзии................................................................................
  
const varziaGrid = document.getElementById('relicGrid3');
if (varziaGrid) {
  try {
    const res = await fetch(`${BASE}data/eventRelic.json`);
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
  

     const isWarframe = frames.frames.includes(name);
               
        const displayName = isWarframe
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
      item.style.setProperty('--span', (i % 3 === 0) ? 25 : 20);

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
      varziaGrid.appendChild(item);

      registerLazyCard(item, [
        `${BASE}img/frame/${name}.png`,
        `${BASE}img/weapon/${name}.png`
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