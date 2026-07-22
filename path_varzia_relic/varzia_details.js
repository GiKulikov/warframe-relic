import { currentLang, dict, loadLang, applyGeneralLang } from '../lang/lang.js';
import { loadPage, BASE,getItemData } from '../loadPage.js';

export async function init() {

  applyGeneralLang(dict, document.getElementById('content'));
  const decodedName = sessionStorage.getItem('selectedPrime');
  const frameName = decodedName;
  const frameTitle = document.getElementById('frameTitle');


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




  const res = await fetch(`${BASE}data/varziaRelic.json`);
  const primes = await res.json();
  const parts = primes[decodedName] || [];

  const container = document.getElementById('partsContainer');
  const containerForCost = document.getElementsByClassName('contWithPartsWithCost')[0];
  containerForCost.innerHTML = '';
  container.innerHTML = '';

  
  function createPartCard(name, data) {
    const card = document.createElement('div');
    card.className = 'partWithCost';

    const isFrameEntity = framesData.frames?.includes(decodedName) || framesData.sentinels?.includes(decodedName);




    var result = name.replaceAll('_', ' ');

    var replacedName = result.replace(/^.*\bprime\b\s*/i, '').trim();
    var upName = replacedName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    if (data.error != null) {
      upName += ": " + data.error;
    }
    const frameDict = isFrameEntity
      ? dict.frame.name_frame_parts[upName]
      : dict.weapon.name_weapon_parts[upName];
    card.innerHTML = `
    <div  class="itemName">
      <span>${frameDict || upName}</span>
    </div>
   <div class="contForPrice">
      <div class="ForPrice"> 
       
        <span >${dict.general.item.for} 48${dict.general.time.hours}</span>
        <div class="NamePrice">
           ${dict.general.item.minimum_trade_price}
          <span >${data.minPrice_48h}</span>
        </div>
        
        <div class="NamePrice">
          ${dict.general.item.maximum_trade_price}
          <span >${data.maxPrice_48h}</span>
        </div>
         <div class="NamePrice">
          ${dict.general.item.trade_volume}

          <span >${data.volume_48h}</span>
        </div>
      </div>
      <div class="ForPrice">
        <span >${dict.general.item.for} 1${dict.general.time.hours}</span>
        <div class="NamePrice">
          ${dict.general.item.buy_price}
          <span >${data.buyPrice_1h}</span>
        </div>
        <div class="NamePrice">
          ${dict.general.item.sell_price}
          <span >${data.sellPrice_1h}</span>
        </div>
        <div class="NamePrice">
            ${dict.general.item.trade_volume}
          <span >${data.volume_1h}</span>
        </div>
      </div>
      
    </div> 
    <div class="NameAveragePricePrice">
      ${dict.general.item.average_price}
      <span  >${data.averagePrice_48h}</span>
    </div>
  `;
    return card;
  }
  async function loadAndDisplayItem(itemPath, container) {
    const data = await getItemData(itemPath);
    if (!data) return;

    Object.entries(data).forEach(([partName, partData]) => {
      const card = createPartCard(partName, partData);
      container.appendChild(card);
    });
  }

  const allPartName = new Set();
  var itemNameSlug = null;
  var partNameSlug = null;


  parts.forEach(({ item, relic }) => {
    const card = document.createElement('div');
    card.className = 'part-card';
    const contForCard = document.createElement('div');
    contForCard.className = 'contForCard';

    const isFrameEntity = framesData.frames?.includes(decodedName) || framesData.sentinels?.includes(decodedName);

    itemNameSlug = decodedName.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');
    partNameSlug = item.toLowerCase().replace(/\s+/g, '_').replace(itemNameSlug + '_', '');
    const marketSetSlug = item.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');
    const relicSlug = relic.toLowerCase().replace(/\s+/g, '_').replace(/'/g, '') + '_relic';

    const frameDict = isFrameEntity
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
      partDisplayName;

    allPartName.add(partNameSlug);
    let displayPart = displayNamePart;
    if (displayNamePart.trim().split(/\s+/).length >= 2) {
      displayPart = displayNamePart.replace("Blueprint", "").trim();
    }
    contForCard.innerHTML = `
    <div class ="NamePart">
      <span >${displayPart}</span>
     
    </div>
   `
    card.innerHTML = `
    
      <div class="descriptionFallRelic">
      ${dict.general.item.getting_of_relic}:
    </div>
    <span class="relic-name">${relic}</span>
      <span class="NamePartHidden">${displayPart}</span>


      <div class="contBtn">
        <button class="market-btn"
          onclick="window.open('https://warframe.market/items/${marketSetSlug}', '_blank')">
          ${dict.general.item.buy_part}
        </button>

        <div class="btns">
          <button class="relic-btn"
            onclick="window.open('https://warframe.market/items/${relicSlug}', '_blank')">
            ${dict.general.item.buy_relic}
          </button>

         
        </div>

      </div>
    `;

    const frameEl = card.querySelector('.NamePartHidden');
    const relicEl = card.querySelector('.relic-name');

    card.querySelector('.market-btn').addEventListener('mouseenter', () => {
      frameEl.style.textShadow = '0px 0px 5px rgba(255, 255, 255, 0.719)';
    });
    card.querySelector('.market-btn').addEventListener('mouseleave', () => {
      frameEl.style.textShadow = '';
    });
    card.querySelector('.relic-btn').addEventListener('mouseenter', () => {
      relicEl.style.color = '#c7afec';
    });
    card.querySelector('.relic-btn').addEventListener('mouseleave', () => {
      relicEl.style.color = '';
    });
    
    




    contForCard.appendChild(card)
    container.appendChild(contForCard);
  });
  
  var result = [...allPartName].join(';');

  var patheApi = itemNameSlug + ';' + result;
  loadAndDisplayItem(patheApi, containerForCost);
  return {
    destroy() {

    }
  }
}