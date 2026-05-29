let currentPage = null;
let currentCss = null;
import { currentLang, dict, loadLang, applyGeneralLang, t } from './lang/lang.js';
export const BASE = location.hostname.endsWith('github.io')
  ? '/' + location.pathname.split('/')[1] + '/'
  : '/';


function unloadCurrentPage() {
  if (!currentPage) return;

  if (typeof currentPage.destroy === 'function') {
    currentPage.destroy();
  }

  document.getElementById('content').innerHTML = '';
  currentPage = null;
}

export async function loadPage(name) {
  unloadCurrentPage();
  setPage(name);
  const content = document.getElementById('content');

  const html = await fetch(`${BASE}${name}.html`).then(r => r.text());
  content.innerHTML = html;

  if (currentCss) currentCss.remove();
  currentCss = Object.assign(document.createElement('link'), {
    rel: 'stylesheet',
    href: `${BASE}${name}.css`
  });
  document.head.append(currentCss);

  const module = await import(`${BASE}${name}.js`);
  currentPage = module.init ? module.init() : module;
}
function setPage(page) {
  const decodedName = sessionStorage.getItem('selectedPrime');
  const translatedName =
    dict.frame.name_frame?.[decodedName] ??
    dict.weapon.name_weapon?.[decodedName] ??
    decodedName;

  switch (page) {

    case "home/home":
      document.title =
        "Warframe Relic | " + dict.general.navigation.home;

      document.querySelector(
        'meta[name="description"]'
      ).content =
        dict.general.meta.home;
      break;

    case "path_prime/prime_details":
      document.title =
        t(
          "general.title.prime_details",
          {
            name: translatedName
          });

      document.querySelector(
        'meta[name="description"]'
      ).content =
        t(
          "general.meta.prime_details",
          {
            name: translatedName
          });
      break;


    case "path_varzia_relic/varzia_details":
      document.title =
        t(
          "general.title.prime_details",
          {
            name: translatedName
          });

      document.querySelector(
        'meta[name="description"]'
      ).content =
        t(
          "general.meta.varzia_details",
          {
            name: translatedName
          });
      break;

    case "path_prime/primes":
      document.title =
        "Warframe Relic" + " | " + dict.general.navigation.menu_current_prime_parts;

      document.querySelector(
        'meta[name="description"]'
      ).content =
        dict.general.meta.primes;
      break;


    case "path_varzia_relic/varzia_relics":
      document.title =
        "Warframe Relic" + " | " + dict.general.navigation.menu_current_varzia_relics;

      document.querySelector(
        'meta[name="description"]'
      ).content =
        dict.general.meta.varzia_relics;
      break;


    case "path_actual_relics/actual_relics":
      document.title =
        "Warframe Relic" + " | " + dict.general.navigation.menu_actual_relics;

      document.querySelector(
        'meta[name="description"]'
      ).content =
        dict.general.meta.home;

      break;

  }

}
