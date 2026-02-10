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
  const url = `${WIKI_BASE}/Warframes`;
  const res = await fetch(url);
  const html = await res.text();

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const warframes = [...document.querySelectorAll('.WarframeNavBoxText > a')]
    .map(el => el.textContent.trim())
    .filter(Boolean);

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
    return;
  }

  const res = await fetch(imageUrl);
  if (!res.ok) {
    return;
  }

  const buffer = await res.buffer();
  fs.writeFileSync(filePath, buffer);
}

(async () => {
  try {
    const warframes = await getWarframeList();

    for (const name of warframes) {
      if (await hasPrimeVersion(name)) {
        await downloadPrimeImage(name);
      } else {
      }
    }

  } catch (err) {
    console.error( err);
  }
  console.log("all")
})();
