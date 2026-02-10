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
        if (dateElem) dateElem.textContent = `${dict.general.common.date_update}: ${data.date}`;
      } catch (err) {
        console.error( err);
      }

      const res1 = await fetch(`${BASE}data/VisibleContent.json`);
          const visibleContent =await res1.json();
          
          const primesGrid = document.getElementById('primesContainer');
          if (visibleContent.status === false) {
          primesGrid.innerText = dict.general.common.data_not_updated;
          return;
          }
          

      // Загрузка прайм-частей///////////////////////////////////////////////////////////////////////////////
      const content = document.getElementById('content');
    const primeGrid = content.querySelector('#primesContainer');
      if (primeGrid) {
        try {
          const res = await fetch(`${BASE}data/primes.json`);
          const primes = await res.json();


        const newPrimes = Object.entries(primes.added).filter(([name]) => {
              
              return !(name in primes.current) && !(name in primes.removed);
          });
          const UPDATEdPrimes = Object.entries(primes.current).filter(([name]) => {
              
              return (name in primes.added);
          });

          const oldPrimes = Object.entries(primes.current)
            .filter(([name]) => !(name in primes.added)
          );
          
          const selectedPrimes = [
            ...newPrimes,
            ...UPDATEdPrimes,
            ...oldPrimes 
          ];
          

          primeGrid.innerHTML = '';
          
          function getPrimePartType(name, item) {
            if (!name || !item) return null;
            let part = item;
            part = part.replace(name, '').trim();
            part = part.replace(/Blueprint$/i, '').trim();
            return part || 'Blueprint';
          }
          
          selectedPrimes.forEach(async ([name, parts ], i) => {
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
              part ='parts'; 
            }

            item.className = 'grid-item';
            item.innerHTML = `
            <div class="description-card">
            ${boolNew ? '<label class="new-badge">NEW</label>' :  boolupdate ?'<label class="new-badge">UPDATED</label>' :''}
            <label class="name-card"> ${displayName}</label>
              <label class="addition">${frameCount} ${part} ${dict.general.item.card_description}</label>
            
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

      

    async function initPrimeSearchStyled() {
    const content = document.getElementById('content');          
    const container = content.querySelector('#primesContainer'); 
    const searchInput = content.querySelector('#searchInput');   




      let primes = {};
      try {
        const res = await fetch(`${BASE}data/primes.json`);
        if (!res.ok) throw new Error(`${res.status}`);
        primes = await res.json();
      } catch (err) {
        console.error(err);
        return;
      }

      // Функция поиска и отображения,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
      function searchPrimes(filter = '') {
        
        container.innerHTML = '';

        const namesSet = new Set([
          ...Object.keys(primes.current || {}),
          ...Object.keys(primes.added || {})
        ]);

        const lowerFilter = filter.toLowerCase().trim();
        function getPrimePartType(name, item) {
            if (!name || !item) return null;
            let part = item;
            part = part.replace(name, '').trim();
            part = part.replace(/Blueprint$/i, '').trim();
            return part || 'Blueprint';
          }

      const results = Array.from(namesSet)
      .filter(name => {
        const en = name.toLowerCase();  
        const ru =
          dict.frame?.name_frame?.[name]?.toLowerCase() ||
          dict.weapon?.name_weapon?.[name]?.toLowerCase() ||
          '';

        const allRelics = [
          ...(primes.current[name] || []),
          ...(primes.added[name] || [])
        ];

        return en.includes(lowerFilter) || ru.includes(lowerFilter) ||
          allRelics.some(r => r.relic && r.relic.toLowerCase().includes(lowerFilter));
      })
      .map(name => ({
        name,
        currentParts: primes.current[name] || [],
        addedParts: primes.added[name] || []
      }));


    for (const {name, currentParts, addedParts} of results) {
      // подсчёт уникальных частей прайм-объекта
      const allParts = [...currentParts, ...addedParts];
      const frameParts = new Set();
      allParts.forEach(p => {
        const type = getPrimePartType(name, p.item);
        if (type) frameParts.add(type);
      });
      const frameCount = frameParts.size;
      

      // определение статусов
      const statuscurr = addedParts.filter(added =>
        currentParts.some(current => current.item === added.item)
      );
      const statusaded = currentParts.filter(current =>
        addedParts.some(added => added.item === current.item)
      );

      let boolNew = false;
      let boolupdate = false;
      if(statuscurr.length===0 && addedParts.length>0){
        boolNew = true;
      }
      else if(statusaded.length>0 && currentParts.length>0){
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

      const item = document.createElement('div');
      item.className = 'grid-item';
      item.innerHTML = `
        <div class="description-card">
          ${boolNew ? '<label class="new-badge">NEW</label>' :  boolupdate ?'<label class="new-badge">UPDATED</label>' :''}
          <label class="name-card">${displayName}</label>
          <label class="addition">${frameCount} ${part} ${dict.general.item.card_description}</label>
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
                loadPage('path_prime/prime_details');

                window.location.hash = `#/path_prime/prime_details`;
            });


            container.appendChild(item);
            registerLazyCard(item, [
                `${BASE}img/frame/${name}.png`,
                `${BASE}img/weapon/${name}.png`
              ], PLACEHOLDER);
          };
      }

      searchInput.addEventListener('input', () => {
        searchPrimes(searchInput.value);
      });

      searchPrimes('');
    }

    initPrimeSearchStyled(content); 

 return {
    destroy() {
      document.removeEventListener('click', onClick);
    }
  }
}