const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Venues discovered from TikTok that aren't in DB
const newVenues = [
  { name: 'Corner Social NYC', city: 'Manhattan', category: 'lounge', music: 'hip-hop', vibe: 'turn-up' },
  { name: 'Doha Bar Lounge', city: 'Manhattan', category: 'lounge', music: 'hip-hop', vibe: 'upscale' },
  { name: 'Loosies NYC', city: 'Brooklyn', category: 'bar', music: 'hip-hop', vibe: 'turn-up' },
  { name: 'Westlight NYC', city: 'Brooklyn', category: 'rooftop', music: 'house', vibe: 'upscale' },
  { name: 'Suite 36', city: 'Manhattan', category: 'club', music: 'hip-hop', vibe: 'turn-up' },
  { name: 'Slate NYC', city: 'Manhattan', category: 'lounge', music: 'hip-hop', vibe: 'trendy' },
  { name: 'Glass Ceiling Rooftop', city: 'Manhattan', category: 'rooftop', music: 'house', vibe: 'upscale' },
  { name: 'Cantina Rooftop', city: 'Manhattan', category: 'rooftop', music: 'latin', vibe: 'turn-up' },
  { name: 'Aura 57 NYC', city: 'Manhattan', category: 'lounge', music: 'afrobeats', vibe: 'turn-up' },
  { name: 'Row House Harlem', city: 'Manhattan', category: 'lounge', music: 'hip-hop', vibe: 'chill' },
  { name: 'Harbor NYC', city: 'Manhattan', category: 'lounge', music: 'hip-hop', vibe: 'turn-up' },
  { name: 'Lot 45 Bushwick', city: 'Brooklyn', category: 'club', music: 'house', vibe: 'turn-up' },
  { name: 'Aura Lounge NYC', city: 'Manhattan', category: 'lounge', music: 'hip-hop', vibe: 'upscale' },
  { name: 'Aya Hookah Lounge', city: 'Manhattan', category: 'hookah', music: 'hip-hop', vibe: 'chill' },
  { name: '230 Fifth Rooftop', city: 'Manhattan', category: 'rooftop', music: 'top40', vibe: 'trendy' },
];

const insert = db.prepare(`
  INSERT INTO venues (name, city, category, tiktok_tags, tiktok_score, should_exclude, rating)
  VALUES (?, ?, ?, ?, ?, 0, 4.5)
`);

let added = 0;
for (const v of newVenues) {
  // Check if exists
  const exists = db.prepare('SELECT id FROM venues WHERE LOWER(name) LIKE ?').get(`%${v.name.toLowerCase().split(' ')[0]}%`);
  if (exists) {
    console.log(`⏭️  Skipping ${v.name} (already exists)`);
    continue;
  }
  
  const tags = JSON.stringify([
    `music:${v.music}`,
    `vibe:${v.vibe}`,
    'best:saturday',
    'best:friday'
  ]);
  
  try {
    insert.run(v.name, v.city, v.category, tags, 85);
    console.log(`✅ Added: ${v.name} (${v.city}) - ${v.music}/${v.vibe}`);
    added++;
  } catch (e) {
    console.log(`❌ Error adding ${v.name}:`, e.message);
  }
}

console.log(`\n🎉 Added ${added} new venues!`);
db.close();
