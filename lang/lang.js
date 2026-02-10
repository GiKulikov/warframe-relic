export let dict = {};
export let currentLang = '';
export async function loadLang(lang) {
  currentLang = lang;
  const [
    frameNames,
    frameParts,
    weaponNames,
    weaponParts,
    generalDict
  ] = await Promise.all([
    fetch(`./lang/${lang}/frame/name_frame.json`).then(r => r.json()),
    fetch(`./lang/${lang}/frame/name_frame_parts.json`).then(r => r.json()),
    fetch(`./lang/${lang}/weapon/name_weapon.json`).then(r => r.json()),
    fetch(`./lang/${lang}/weapon/name_weapon_parts.json`).then(r => r.json()),
    fetch(`./lang/${lang}/general/dictionary.json`).then(r => r.json())
  ]);

  dict = {
    frame: {
      name_frame: frameNames,
      name_frame_parts: frameParts
    },
    weapon: {
      name_weapon: weaponNames,
      name_weapon_parts: weaponParts
    },
    general: generalDict
  };

  return dict;
}

export function applyGeneralLang(dict, container = document) {
  container.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const value = key.split('.').reduce((o, k) => o?.[k], dict);
    if (value) el.textContent = value;
  });
    container.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const value = key.split('.').reduce((o, k) => o?.[k], dict);
    if (value) el.placeholder = value;
  });
}
