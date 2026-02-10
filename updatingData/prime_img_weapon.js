const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const frameDir = path.join(__dirname, '../img/frame');
const weaponDir = path.join(__dirname, '../img/weapon');

const jsonFiles = [
  path.join(__dirname, '../data/primes.json'),    
  path.join(__dirname, '../data/eventRelic.json')   
];

if (!fs.existsSync(weaponDir)) {
  fs.mkdirSync(weaponDir, { recursive: true });
}

async function processFile(filePath) {
  let primesData;
  try {
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (path.basename(filePath) === 'primes.json') {
      primesData = {
        ...rawData.current,
        ...rawData.added
      };
    } else {
      primesData = rawData;
    }
  } catch (err) {
    console.error(`${path.basename(filePath)}:`, err.message);
    return;
  }

  const weapons = Object.keys(primesData).filter(name => name.endsWith(' Prime'));

  for (const weaponName of weapons) {
    const baseName = weaponName.replace(/\s+/g, '');
    const fileName = `${weaponName}.png`;

    const framePath = path.join(frameDir, fileName);
    const weaponPath = path.join(weaponDir, fileName);

    if (fs.existsSync(framePath)) {
      continue;
    }

    if (fs.existsSync(weaponPath)) {
      continue;
    }

    const imageUrl = `https://wiki.warframe.com/images/${baseName}.png`;

    try {
      const res = await fetch(imageUrl);

      if (!res.ok) {
        continue;
      }

      const buffer = await res.buffer();
      fs.writeFileSync(weaponPath, buffer);
    } catch (error) {
      console.log(`${weaponName}: ${error.message}`);
    }
  }
}

(async () => {
  for (const filePath of jsonFiles) {
    console.log(`\n${path.basename(filePath)}`);
    await processFile(filePath);
  }
  console.log("all")
})();