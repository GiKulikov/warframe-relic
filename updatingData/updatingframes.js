import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import fs from "fs";

const OUTPUT = "C:/Vscode/WarframeRelic/data/frames.json";

async function pageExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function getPrimeWarframes() {
  const URL = "https://wiki.warframe.com/w/Warframes";
  const res = await fetch(URL);
  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const frames = [];

  const links = doc.querySelectorAll(".WarframeNavBoxText a");

  for (const a of links) {
    const baseName = a.textContent.trim();
    if (!baseName || baseName.includes("Prime")) continue;

    const primeUrl = `https://wiki.warframe.com/w/${baseName.replace(/ /g, "_")}_Prime`;
    const exists = await pageExists(primeUrl);

    if (exists) {
      frames.push(`${baseName} Prime`);
      console.log("✔ Found Frame:", baseName);
    }
  }

  return frames;
}

async function getPrimeSentinels() {
  const URL = "https://wiki.warframe.com/w/Sentinel";
  const res = await fetch(URL);
  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const primes = [];

  const container = doc.querySelector(
    "#mw-content-text > div.mw-content-ltr.mw-parser-output > div:nth-child(2)"
  );

  if (container) {
    const links = container.querySelectorAll("a");

    links.forEach(a => {
      const name = a.textContent.trim();
      if (name) {
        primes.push(`${name} Prime`);
        console.log("✔ Found Sentinel Prime:", name);
      }
    });
  }

  return primes;
}

async function main() {
  const frames = await getPrimeWarframes();
  const sentinels = await getPrimeSentinels();

  const allPrimes = [...new Set([...frames, ...sentinels])].sort();

  const json = { frames: allPrimes };

  fs.writeFileSync(OUTPUT, JSON.stringify(json, null, 2), "utf-8");

  console.log(`Saved ${allPrimes.length} Prime items`);
}

main().catch(console.error);
