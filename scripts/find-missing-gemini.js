import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const content = fs.readFileSync('/opt/viberyte/lumina-scripts/results.txt', 'utf-8');

// Get all current Instagram handles in database
const existingHandles = new Set(
  db.prepare(`SELECT LOWER(instagram_handle) FROM venues WHERE instagram_handle IS NOT NULL`)
    .all()
    .map(r => r['LOWER(instagram_handle)'])
);

console.log(`\n📊 ${existingHandles.size} Instagram handles already in database\n`);

// Find handles in Gemini that aren't in database
const lines = content.split('\n').filter(l => l.trim() && !l.includes('Not Found'));
let newHandles = 0;
let alreadyHave = 0;

console.log('NEW HANDLES NOT YET IN DATABASE:\n');

for (const line of lines) {
  const [websiteUrl, igUrl] = line.split('|').map(s => s.trim());
  const match = igUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  
  if (!match) continue;
  
  const handle = match[1].replace('/', '').toLowerCase();
  
  if (!existingHandles.has(handle)) {
    console.log(`${websiteUrl} -> @${handle}`);
    newHandles++;
  } else {
    alreadyHave++;
  }
}

console.log(`\n📊 SUMMARY:`);
console.log(`   New handles in Gemini: ${newHandles}`);
console.log(`   Already in database: ${alreadyHave}`);

db.close();
