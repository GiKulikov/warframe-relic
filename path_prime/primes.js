/* ========= Общие хелперы для ленивой загрузки ========= */
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

const PLACEHOLDER = '../img/placeholder.png';

document.addEventListener('DOMContentLoaded', async () => {
  

  // Установка даты
  const dateElem = document.getElementById('date');
  try {
    const res = await fetch('../public/last_update.json');
    if (!res.ok) throw new Error('Не удалось загрузить last_update.json');
    const data = await res.json();
    if (dateElem) dateElem.textContent = `Дата обновления: ${data.date}`;
  } catch (err) {
    console.error('❌ Ошибка при получении даты:', err);
    if (dateElem) dateElem.textContent = 'Дата обновления: неизвестна';
  }

  const res1 = await fetch('../public/VisibleContent.json');
      const visibleContent =await res1.json();
      
      const primesGrid = document.getElementById('primesContainer');
      if (visibleContent.status === false) {
      primesGrid.innerText = 'Данные не обновлены.';
      return;
      }
      

  // Загрузка прайм-частей///////////////////////////////////////////////////////////////////////////////
  const primeGrid = document.getElementById('primesContainer');
  if (primeGrid) {
    try {
      primeGrid.innerText = 'Загрузка прайм частей...';
      const res = await fetch('../public/primes.json');
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
      
      
      selectedPrimes.forEach(([name, parts ], i) => {
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
        
        let part = '';
        if(frameCount<5){
          part = 'части';
        }
        else{
          part = 'частей';
        }
       
        item.className = 'grid-item';
        item.innerHTML = `
        <div class="description-card">
         ${boolNew ? '<label class="new-badge">NEW</label>' :  boolupdate ?'<label class="new-badge">UPDATED</label>' :''}
          <label class="name-card">${name}</label>
          <label class="addition">${frameCount} ${part} в актуальных реликвиях</label>
         
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
          const encoded = encodeURIComponent(name);
          window.location.href = `../path_prime/prime_details.html?name=${encoded}`;
        });

        primeGrid.appendChild(item);

        registerLazyCard(item, [
          `../img/frame/${name}.png`,
          `../img/weapon/${name}.png`
        ], PLACEHOLDER);
      });

      if (selectedPrimes.length === 0) {
        primeGrid.innerText = 'Нет доступных прайм-частей.';
      }
    } catch (err) {
      primeGrid.innerText = 'Ошибка загрузки прайм частей.';
      console.error(err);
    }
  }

  
});
async function initPrimeSearchStyled() {
  const container = document.getElementById('primesContainer');
  const searchInput = document.getElementById('searchInput');
  container.innerText = 'Загрузка данных...';

  // Загружаем JSON с праймами
  let primes = {};
  try {
    const res = await fetch('../public/primes.json');
    if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
    primes = await res.json();
  } catch (err) {
    container.innerText = 'Ошибка загрузки данных.';
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

    // Ищем совпадения
   const results = Array.from(namesSet)
  .filter(name => {
    if (name.toLowerCase().includes(lowerFilter)) return true;
    const allRelics = [...(primes.current[name] || []), ...(primes.added[name] || [])];
    return allRelics.some(r => r.relic && r.relic.toLowerCase().includes(lowerFilter));
  })
  .map(name => {
    return {
      name,
      currentParts: primes.current[name] || [],
      addedParts: primes.added[name] || []
    };
  });

results.forEach(({name, currentParts, addedParts}, i) => {
  // подсчёт уникальных частей прайм-объекта
  const allParts = [...currentParts, ...addedParts];
  const frameParts = new Set();
  allParts.forEach(p => {
    const type = getPrimePartType(name, p.item);
    if (type) frameParts.add(type);
  });
  const frameCount = frameParts.size;
  const partWord = frameCount < 5 ? 'части' : 'частей';

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

  const item = document.createElement('div');
  item.className = 'grid-item';
  item.innerHTML = `
    <div class="description-card">
       ${boolNew ? '<label class="new-badge">NEW</label>' :  boolupdate ?'<label class="new-badge">UPDATED</label>' :''}
      <label class="name-card">${name}</label>
      <label class="addition">${frameCount} ${partWord} в актуальных реликвиях</label>
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
          const encoded = encodeURIComponent(name);
          window.location.href = `../path_prime/prime_details.html?name=${encoded}`;
        });

        container.appendChild(item);
        registerLazyCard(item, [
            `../img/frame/${name}.png`,
            `../img/weapon/${name}.png`
          ], PLACEHOLDER);
      });
  }

  // Привязка поиска к полю
  searchInput.addEventListener('input', () => {
    searchPrimes(searchInput.value);
  });

  // Первичный вывод
  searchPrimes('');
}

document.addEventListener('DOMContentLoaded', initPrimeSearchStyled);
