const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const frameDir = path.join(__dirname, '../img/frame');
const weaponDir = path.join(__dirname, '../img/weapon');

// Два файла по очереди
const jsonFiles = [
  path.join(__dirname, '../public/primes.json'),      // для прайм
  path.join(__dirname, '../public/eventRelic.json')   // для ивента
];

// Создаём папки, если их нет
if (!fs.existsSync(weaponDir)) {
  fs.mkdirSync(weaponDir, { recursive: true });
}

async function processFile(filePath) {
  let primesData;
  try {
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    // Для primes.json учитываем новую структуру { current, added, removed }
    if (path.basename(filePath) === 'primes.json') {
      primesData = {
        ...rawData.current,
        ...rawData.added
      };
    } else {
      // Для eventRelic.json оставляем как есть
      primesData = rawData;
    }
  } catch (err) {
    console.error(`❌ Ошибка чтения ${path.basename(filePath)}:`, err.message);
    return;
  }

  // Получаем список Prime-оружий
  const weapons = Object.keys(primesData).filter(name => name.endsWith(' Prime'));

  for (const weaponName of weapons) {
    const baseName = weaponName.replace(/\s+/g, '');
    const fileName = `${weaponName}.png`;

    const framePath = path.join(frameDir, fileName);
    const weaponPath = path.join(weaponDir, fileName);

    if (fs.existsSync(framePath)) {
      console.log(`⏭️ Пропущено (уже есть в frame): ${fileName}`);
      continue;
    }

    if (fs.existsSync(weaponPath)) {
      console.log(`✅ Уже загружено ранее в weapon: ${fileName}`);
      continue;
    }

    const imageUrl = `https://wiki.warframe.com/images/${baseName}.png`;

    try {
      console.log(`📥 Скачиваем: ${imageUrl}`);
      const res = await fetch(imageUrl);

      if (!res.ok) {
        console.log(`❌ Не найдено: ${imageUrl}`);
        continue;
      }

      const buffer = await res.buffer();
      fs.writeFileSync(weaponPath, buffer);
      console.log(`✅ Сохранено: ${weaponPath}`);
    } catch (error) {
      console.log(`❗ Ошибка при скачивании ${weaponName}: ${error.message}`);
    }
  }
}

(async () => {
  for (const filePath of jsonFiles) {
    console.log(`\n📂 Обработка файла: ${path.basename(filePath)}`);
    await processFile(filePath);
  }
  console.log('\n🎉 Загрузка завершена!');
})();