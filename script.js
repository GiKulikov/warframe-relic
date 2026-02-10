
import { loadPage } from './loadPage.js';
import { dict, loadLang, applyGeneralLang } from '../lang/lang.js';

document.addEventListener('DOMContentLoaded', async () => {


  const combobox = document.querySelector('.combobox');
  const toggleBtn = combobox.querySelector('.combobox-toggle');
  const dropdown = combobox.querySelector('.dropdown');
  const langSelect = document.getElementById('typelang');
  const content = document.getElementById('content');

  /* ========= LANGUAGE ========= */

  const savedLang = sessionStorage.getItem('lang') || 'en';

  if (langSelect) langSelect.value = savedLang;

  await loadLang(savedLang);
  applyGeneralLang(dict, document);


  function resetCombobox() {
    toggleBtn.innerHTML =
      `${dict.general.index.information_about} <span class="arrow">▼</span>`;
  }

  function syncComboboxWithHash() {
    const hash = location.hash;
  

    if (hash.includes('path_prime')) {
      toggleBtn.innerHTML =
        `${dict.general.navigation.menu_current_prime_parts} <span class="arrow">▼</span>`;
    }
    else if (hash.includes('path_varzia_relic')) {
      toggleBtn.innerHTML =
        `${dict.general.navigation.menu_current_varzia_relics} <span class="arrow">▼</span>`;
    }
    else if (hash.includes('path_actual_relics')) {
      toggleBtn.innerHTML =
        `${dict.general.navigation.menu_actual_relics} <span class="arrow">▼</span>`;
    }
    else  {
      resetCombobox();
    }
  }

  function loadFromHash() {
    const hash = location.hash.slice(2);

    if (hash) {
      loadPage(hash);
    } else {
      loadPage('Home/home');
    }

    syncComboboxWithHash();
  }

  /* ========= COMBOBOX ========= */

  toggleBtn.addEventListener('click', e => {
    e.preventDefault();
    combobox.classList.toggle('open');
    toggleBtn.classList.toggle('active');
  });

  dropdown.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      combobox.classList.remove('open');
      toggleBtn.classList.remove('active');
    });
  });

  document.addEventListener('click', e => {
    if (!toggleBtn.contains(e.target)) {
      combobox.classList.remove('open');
      toggleBtn.classList.remove('active');
    }
  });

  /* ========= LANGUAGE CHANGE ========= */

  langSelect.addEventListener('change', () => {
    sessionStorage.setItem('lang', langSelect.value);
    location.reload();
  });

  /* ========= ROUTER ========= */

  window.addEventListener('hashchange', loadFromHash);

  /* ========= NAVIGATION ========= */

  document.querySelector('#primesLink').addEventListener('click', e => {
    e.preventDefault();
    window.location.hash = '#/path_prime/primes';
  });

  document.querySelector('#varziaLink').addEventListener('click', e => {
    e.preventDefault();
    window.location.hash = '#/path_varzia_relic/varzia_relics';
  });

  document.querySelector('#homeLink').addEventListener('click', e => {
    e.preventDefault();
    window.location.hash = '#/Home/home';
  });
  document.querySelector('#actualRelicsLink').addEventListener('click', e => {
    e.preventDefault();
    window.location.hash = '#/path_actual_relics/actual_relics';
  });

  content.addEventListener('click', e => {
    if (e.target.id === 'back_link_v') {
      e.preventDefault();
      window.history.back();
    }

    if (e.target.id === 'back_link_d') {
      e.preventDefault();
      window.history.back();
    }
  });

  /* ========= FIRST LOAD ========= */

  loadFromHash();

});

