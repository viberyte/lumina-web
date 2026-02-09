const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const venuePhotoDir = '/mnt/HC_Volume_104366905/venue-photos';

// Get venues with instagram media
const venues = db.prepare(`
  SELECT DISTINCT v.id, v.name, v.image_url
  FROM venues v
  JOIN venue_instagram_media m ON m.venue_id = v.id
  WHERE v.should_exclude = 0
`).all();

console.log(`Found ${venues.length} venues with Instagram media`);

const updateStmt = db.prepare(`
  UPDATE venues SET image_url = ? WHERE id = ?
`);

const getMedia = db.prepare(`
  SELECT media_url FROM venue_instagram_media 
  WHERE venue_id = ? 
  ORDER BY likes DESC 
  LIMIT 1
`);

let updated = 0, skipped = 0;

for (const venue of venues) {
  // Check if venue-photos file exists
  const dashPath = `${venuePhotoDir}/venue-${venue.id}-1.jpg`;
  const underscorePath = `${venuePhotoDir}/venue_${venue.id}_1.jpg`;
  
  if ((fs.existsSync(dashPath) && fs.statSync(dashPath).size > 5000) ||
      (fs.existsSync(underscorePath) && fs.statSync(underscorePath).size > 5000)) {
    skipped++;
    continue;
  }
  
  // Get best instagram media
  const media = getMedia.get(venue.id);
  if (media && media.media_url) {
    updateStmt.run(media.media_url, venue.id);
    console.log(`✅ ${venue.name} -> ${media.media_url}`);
    updated++;
  }
}

console.log(`\n=== DONE ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped (has photo): ${skipped}`);
