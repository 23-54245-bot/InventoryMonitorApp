const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '../src/lib/i18n.ts');
const content = fs.readFileSync(i18nPath, 'utf8');

const regex = /([A-Za-z]+):\s*\{([\s\S]*?)(?=\n\s*[A-Za-z]+:\s*\{|\n\};)/g;
let match;
const allLangs = {};

while ((match = regex.exec(content)) !== null) {
  const lang = match[1];
  const block = match[2];
  const pairs = {};
  const pairRegex = /([a-zA-Z0-9_]+)\s*:\s*(?:'([^']*)'|"([^"]*)")/g;
  let pm;
  while ((pm = pairRegex.exec(block)) !== null) {
    pairs[pm[1]] = pm[2] !== undefined ? pm[2] : pm[3];
  }
  allLangs[lang] = pairs;
}

fs.writeFileSync(path.join(__dirname, 'all-langs.json'), JSON.stringify(allLangs, null, 2));
console.log('Saved all-langs.json');

