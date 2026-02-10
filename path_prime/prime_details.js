const res = await fetch('../data/frames.json');
const frames = await res.json();
import { dict, loadLang, applyGeneralLang } from '../lang/lang.js';
export async function init() {
  applyGeneralLang(dict, document.getElementById('content'));

  const decodedName = sessionStorage.getItem('selectedPrime');


  const title = document.getElementById('primeTitle');
  if (title) title.textContent = decodedName;

  const frameName = decodedName;
  const frameTitle =  document.getElementById('frameTitle');



  const res = await fetch('../data/primes.json');
  const rawPrimes = await res.json();

  const currentParts = rawPrimes.current[frameName] || [];
  const addedParts   = rawPrimes.added[frameName] || [];
  const removedParts = rawPrimes.removed[frameName] || [];
 
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
  

  const warframeParts = ['Chassis', 'Neuroptics', 'Systems']; 
  const allParts = primes[frameName] || [];
  const partTypes = allParts.map(part => part.item.split(' ').pop());
  const warframeCount = partTypes.filter(p => warframeParts.includes(p)).length;
  const isWarframe = warframeCount > (partTypes.length - warframeCount); 


  let parts = allParts.filter(part => {
    const partName = part.item.split(' ').pop();
    return isWarframe
      ? ['Blueprint', 'Chassis', 'Neuroptics', 'Systems'].includes(partName) 
      : true; 
  });

  if (isWarframe) {
    const partOrder = ['Blueprint', 'Chassis', 'Neuroptics', 'Systems'];
    parts.sort((a, b) => {
      const partNameA = a.item.split(' ').pop();
      const partNameB = b.item.split(' ').pop();
      return partOrder.indexOf(partNameA) - partOrder.indexOf(partNameB);
    });
  } else {
    parts.sort((a, b) => a.item.localeCompare(b.item));
  }

  const container = document.getElementById('partsContainer');
  container.innerHTML = '';

  

  parts.forEach(({ item, relic }) => {
    const card = document.createElement('div');
    card.className = 'part-card';

    const marketSetSlug = item.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');
    const relicSlug = relic.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '') + '_relic';

    const partDisplayName = item.replace(`${frameName} `, '');
    
     var isNewPrime = false;
     var isNewPart = false;
     var isNewRelic = false;

      if (currentParts.length===0 && removedParts.length===0){
        isNewPrime = true;
      }
      if(frameName in rawPrimes.added){
        const addedPart = rawPrimes.added[frameName] || [];
        const currentPart = rawPrimes.current[frameName] || [];
        const removedPart = rawPrimes.removed[frameName] || [];
        const realIsNeWPart= !removedPart.some(p => p.item === item);
        
        const isNeWparts= !currentPart.some(p => p.item === item);
        if(isNeWparts && realIsNeWPart){
          isNewPart = true;
        }
       
        if(addedPart.some(p => p.relic === relic)){
          
          isNewRelic = true;

        }
        
      }
      // Проверяем, является ли объект фреймом или оружием и языки
      const isWarframe = frames.frames.includes(frameName);

      const frameDict = isWarframe
        ? dict.frame
        : dict.weapon;

      frameTitle.textContent =
        frameDict.name_frame?.[frameName] ??
        frameDict.name_weapon?.[frameName] ??
        frameName;

      const displayNamePart =
        frameDict.name_frame_parts?.[partDisplayName] ??
        frameDict.name_weapon_parts?.[partDisplayName] ??
        partDisplayName;

    card.innerHTML = `
      <div>
      <span class="frame-name">${frameTitle.textContent}: ${displayNamePart}</span>
      ${isNewPart ? '<span class="isNew">NEW</span>' : ''}
      </div><br>
     ${dict.general.item.getting_of_relic}:       <b><span class="relic-name">${relic}</span>
      ${isNewRelic ? '<span class="isNew">NEW</span>' : ''}
      </b><br><br>
      <div class="contBtn">
        <button class="market-btn" onclick="window.open('https://warframe.market/items/${marketSetSlug}', '_blank')">
          ${dict.general.item.buy_part}
        </button>
        <div>
          <button class="relic-btn" onclick="window.open('https://warframe.market/items/${relicSlug}', '_blank')">
            ${dict.general.item.buy_relic}
          </button>
          <button class="wiki-btn" onclick="window.open('https://wiki.warframe.com/w/${relic}', '_blank')">
            ${dict.general.item.source_relic}
          </button>
        </div>
      </div>
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

    card.querySelector('.wiki-btn').addEventListener('mouseenter', () => {
      relicEl.style.color = '#aa62ecff';
    });
     card.querySelector('.wiki-btn').addEventListener('mouseleave', () => {
      relicEl.style.color = '';
    });

    container.appendChild(card);
  });


  return {
    destroy() {
    }
  };
}