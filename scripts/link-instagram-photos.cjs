const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const instagramDir = '/mnt/HC_Volume_104366905/instagram-photos';
const venueDir = '/mnt/HC_Volume_104366905/venue-photos';

// Get venues with instagram handles
const venues = db.prepare(`
  SELECT id, name, instagram_handle 
  FROM venues 
  WHERE instagram_handle IS NOT NULL AND instagram_handle != ''
`).all();

console.log(`Found ${venues.length} venues with Instagram handles`);

// Get existing instagram photos
const igPhotos = fs.readdirSync(instagramDir);
console.log(`Found ${igPhotos.length} Instagram photos`);

let linked = 0, skipped = 0, notFound = 0;

for (const venue of venues) {
  const handle = venue.instagram_handle.replace('@', '').toLowerCase();
  const destPath = path.join(venueDir, `venue_${venue.id}_1.jpg`);
  
  // Skip if already exists
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
    skipped++;
    continue;
  }
  
  // Find matching instagram photo
  const match = igPhotos.find(f => f.toLowerCase().startsWith(handle + '_'));
  
  if (match) {
    const srcPath = path.join(instagramDir, match);
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ ${venue.name} (${handle}) -> venue_${venue.id}_1.jpg`);
    linked++;
  } else {
    notFound++;
  }
}

console.log(`\n=== DONE ===`);
console.log(`Linked: ${linked}`);
console.log(`Skipped (exists): ${skipped}`);
console.log(`Not found: ${notFound}`);
