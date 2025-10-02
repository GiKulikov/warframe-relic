import fetch from 'node-fetch';
import jsdom from 'jsdom';
import fs from 'fs';
import path from 'path';

const { JSDOM } = jsdom;
const WIKI_BASE = 'https://wiki.warframe.com/w';
const saveDir = path.resolve('img/frame');

if (!fs.existsSync(saveDir)) {
  fs.mkdirSync(saveDir, { recursive: true });
}

async function getWarframeList() {
  console.log('🔍 Получаем список Warframes...');
  const url = `${WIKI_BASE}/Warframes`;
  const res = await fetch(url);
  const html = await res.text();

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const warframes = [...document.querySelectorAll('.WarframeNavBoxText > a')]
    .map(el => el.textContent.trim())
    .filter(Boolean);

  console.log(`✅ Найдено Warframes: ${warframes.length}`);
  return warframes;
}

async function hasPrimeVersion(name) {
  const url = `${WIKI_BASE}/${encodeURIComponent(name)}/Prime`;
  const res = await fetch(url);
  return res.ok;
}

async function downloadPrimeImage(name) {
  const imageUrl = `https://wiki.warframe.com/images/${name}PrimeFull.png`;
  const filePath = path.join(saveDir, `${name} Prime.png`);
  if (fs.existsSync(filePath)) {
    console.log(`⏩ Пропущено (уже есть): ${filePath}`);
    return;
  }

  const res = await fetch(imageUrl);
  if (!res.ok) {
    console.log(`❌ Нет картинки: ${imageUrl}`);
    return;
  }

  const buffer = await res.buffer();
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Скачано: ${filePath}`);
}

(async () => {
  try {
    const warframes = await getWarframeList();

    for (const name of warframes) {
      console.log(`🔍 Проверяем: ${name}`);
      if (await hasPrimeVersion(name)) {
        await downloadPrimeImage(name);
      } else {
        console.log(`🚫 Prime-версии нет: ${name}`);
      }
    }

    console.log('🎉 Все загрузки завершены!');
  } catch (err) {
    console.error('❗ Ошибка:', err);
  }
})();
