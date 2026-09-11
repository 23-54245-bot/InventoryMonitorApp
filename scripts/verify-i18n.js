const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '../src/lib/i18n.ts');
const content = fs.readFileSync(i18nPath, 'utf8');

const regex = /([A-Za-z]+):\s*\{([\s\S]*?)(?=\n\s*[A-Za-z]+:\s*\{|\n\};)/g;
let match;
const languages = {};
while ((match = regex.exec(content)) !== null) {
  const lang = match[1];
  const block = match[2];
  const keys = new Set();
  const keyRegex = /^\s*([a-zA-Z0-9_]+)\s*:/gm;
  let km;
  while ((km = keyRegex.exec(block)) !== null) {
    keys.add(km[1]);
  }
  languages[lang] = keys;
}

const engKeys = languages['English'] || new Set();
console.log(`========================================`);
console.log(` StockTrack i18n Translation Health Check`);
console.log(`========================================`);
console.log(`English Total Master Keys: ${engKeys.size}`);
console.log(`----------------------------------------`);

let totalMissing = 0;
for (const [lang, keys] of Object.entries(languages)) {
  if (lang === 'English') continue;
  const missing = [...engKeys].filter(k => !keys.has(k));
  totalMissing += missing.length;
  const status = missing.length === 0 ? '✅ 100% Complete' : `⚠️ Missing ${missing.length} keys`;
  console.log(`${lang.padEnd(12)} : ${String(keys.size).padStart(3)} keys | ${status}`);
}
console.log(`----------------------------------------`);
if (totalMissing === 0) {
  console.log(`🎉 All 12 languages are 100% complete!`);
} else {
  console.log(`Total missing translations across languages: ${totalMissing}`);
}
console.log(`========================================\n`);
