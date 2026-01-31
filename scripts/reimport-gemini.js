import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const content = fs.readFileSync('/opt/viberyte/lumina-scripts/results.txt', 'utf-8');

console.log('\n🔄 RE-IMPORTING GEMINI RESULTS WITH BETTER MATCHING\n');
console.log('='.repeat(60));

const lines = content.split('\n').filter(l => l.trim() && !l.includes('Not Found'));
console.log(`\n✅ ${lines.length} handles to import\n`);

const venues = db.prepare(`
  SELECT id, name, website 
  FROM venues 
  WHERE state IN ('NY', 'NJ')
`).all();

let saved = 0;
let skipped = 0;

for (const line of lines) {
  const [websiteUrl, igUrl] = line.split('|').map(s => s.trim());
  
  const match = igUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  if (!match) continue;
  
  const handle = match[1].replace('/', '');
  
  // Better matching - normalize both URLs
  const cleanUrl = websiteUrl.toLowerCase()
    .replace(/https?:\/\/(www\.)?/, '')
    .split(/[?#\/]/)[0];
  
  const venue = venues.find(v => {
    if (!v.website) return false;
    const cleanVenue = v.website.toLowerCase()
      .replace(/https?:\/\/(www\.)?/, '')
      .split(/[?#\/]/)[0];
    
    return cleanUrl === cleanVenue || 
           cleanUrl.includes(cleanVenue) || 
           cleanVenue.includes(cleanUrl);
  });
  
  if (!venue) {
    console.log(`   ⚠️  No match: ${websiteUrl}`);
    continue;
  }
  
  try {
    db.prepare(`
      UPDATE venues SET instagram_handle = ? WHERE id = ?
    `).run(handle, venue.id);
    
    saved++;
    if (saved % 20 === 0) console.log(`   ✓ Saved ${saved}...`);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      skipped++;
    } else {
      throw error;
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ RE-IMPORT COMPLETE!`);
console.log(`   New handles: ${saved}`);
console.log(`   Duplicates: ${skipped}`);
console.log('='.repeat(60) + '\n');

db.close();
