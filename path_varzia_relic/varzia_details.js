import { currentLang,dict, loadLang, applyGeneralLang } from '../lang/lang.js';
import { loadPage,BASE } from '../loadPage.js';
const res = await fetch(`${BASE}data/frames.json`);
const frames = await res.json();
export async  function init() {
    applyGeneralLang(dict, document.getElementById('content'));

    

  const decodedName = sessionStorage.getItem('selectedPrime');

  document.getElementById('frameTitle').innerText = decodedName ;

  const res = await fetch(`${BASE}data/eventRelic.json`);
  const primes = await res.json();

  const parts = primes[decodedName] || [];

  const container = document.getElementById('partsContainer');
  container.innerHTML = '';

   
  parts.forEach(({ item, relic }) => {
    const card = document.createElement('div');
    card.className = 'part-card';
    const isWarframe = frames.frames.includes(decodedName);
      const frameDict = isWarframe
        ? dict.frame
        : dict.weapon;
         const partDisplayName = item.replace(`${decodedName} `, '');

      frameTitle.textContent =
        frameDict.name_frame?.[decodedName] ??
        frameDict.name_weapon?.[decodedName] ??
        decodedName;

      const displayNamePart =
        frameDict.name_frame_parts?.[partDisplayName] ??
        frameDict.name_weapon_parts?.[partDisplayName] ??
        item;

    const marketSetSlug = item.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');
    const relicSlug = relic.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '') + '_relic';
    console.log(displayNamePart)
    card.innerHTML = `
      <strong><span class="frame-name"> ${displayNamePart}</span></strong><br>
      ${dict.general.item.getting_of_relic}: <b><span class="relic-name"> ${relic}</span></b><br><br>

      <button class="market-btn" onclick="window.open('https://warframe.market/items/${marketSetSlug}', '_blank')">
        ${dict.general.item.buy_part}
      </button>
      <button class="relic-btn" onclick="window.open('https://warframe.market/items/${relicSlug}', '_blank')">
       ${dict.general.item.buy_relic}
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
       return {
    destroy() {
      document.removeEventListener('click', onClick);
    }
  }
}