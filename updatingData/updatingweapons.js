const fs = require('fs');

const primesPath = './data/primes.json';
const eventPath = './data/eventRelic.json';
const framesPath = './data/frames.json';
const weaponsPath = './data/weapons.json';

try {
    const primesData = JSON.parse(fs.readFileSync(primesPath, 'utf8'));
    const primeNames = [...Object.keys(primesData.current), ...Object.keys(primesData.added)];
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const eventNames = Object.keys(eventData).filter(name => name !== 'status' && name !== 'varziaPeriod');
    const allData = [...primeNames, ...eventNames];

    
    const framesData = JSON.parse(fs.readFileSync(framesPath, 'utf8'));
    const frames = framesData.frames;

    const filteredPrimes = allData.filter(name => !frames.includes(name));

    let existingWeapons = [];
    if (fs.existsSync(weaponsPath)) {
        const weaponsData = JSON.parse(fs.readFileSync(weaponsPath, 'utf8'));
        existingWeapons = weaponsData.weapons || [];
    }

    const newWeapons = filteredPrimes.filter(name => !existingWeapons.includes(name));
    const updatedWeapons = [...existingWeapons, ...newWeapons];

    console.log('Текущих Prime-предметов (оружие):', existingWeapons.length);
    console.log('Новых добавлено:', newWeapons.length);
    
    if (newWeapons.length > 0) {
        console.log('Новые добавленные:');
        newWeapons.forEach((name, index) => {
            console.log(`${index + 1}. ${name}`);
        });
    } else {
        console.log('Нет новых для добавления.');
    }

    const weaponsData = { weapons: updatedWeapons };
    fs.writeFileSync(weaponsPath, JSON.stringify(weaponsData, null, 2), 'utf8');


} catch (error) {
    console.error('Ошибка:', error.message);
}