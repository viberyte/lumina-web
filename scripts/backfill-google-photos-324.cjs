const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const API_KEY = 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs';

// Target: 324 venues with google_place_id but no google_photos
const venues = db.prepare(`
  SELECT id, name, google_place_id, city
  FROM venues
  WHERE should_exclude = 0
    AND google_place_id IS NOT NULL AND google_place_id != ''
    AND (google_photos IS NULL OR google_photos = '' OR google_photos = '[]')
    AND (gallery_photos IS NULL OR gallery_photos = '' OR gallery_photos = '[]')
    AND (image_url IS NOT NULL AND image_url != '')
`).all();

console.log(`[photo-backfill] Found ${venues.length} venues to fetch photos for`);

const updateStmt = db.prepare(`
  UPDATE venues SET google_photos = ? WHERE id = ?
`);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchPhotosForVenue(venue) {
  try {
    // Use Place Details API (New) to get photos
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${venue.google_place_id}&fields=photos&key=${API_KEY}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      console.log(`  ❌ ${venue.name}: HTTP ${res.status}`);
      return 0;
    }
    
    const data = await res.json();
    
    if (data.status !== 'OK' || !data.result?.photos || data.result.photos.length === 0) {
      console.log(`  ⚠️  ${venue.name}: No photos found`);
      return 0;
    }
    
    // Build photo URLs (up to 10 photos per venue)
    const photoUrls = data.result.photos.slice(0, 10).map(photo => {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(photo.photo_reference)}&key=${API_KEY}`;
    });
    
    // Store as JSON array
    updateStmt.run(JSON.stringify(photoUrls), venue.id);
    console.log(`  ✅ ${venue.name} (${venue.city}): ${photoUrls.length} photos`);
    return photoUrls.length;
    
  } catch (err) {
    console.log(`  ❌ ${venue.name}: ${err.message}`);
    return 0;
  }
}

async function main() {
  let total = 0;
  let success = 0;
  let photoCount = 0;
  
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    total++;
    
    if (i > 0 && i % 50 === 0) {
      console.log(`\n--- Progress: ${i}/${venues.length} (${success} updated, ${photoCount} photos) ---\n`);
    }
    
    const count = await fetchPhotosForVenue(venue);
    if (count > 0) {
      success++;
      photoCount += count;
    }
    
    // Rate limit: Google allows 10 QPS, we'll do ~5
    await sleep(200);
  }
  
  console.log(`\n========================================`);
  console.log(`Done! ${success}/${total} venues got photos (${photoCount} total photos)`);
  console.log(`========================================`);
  
  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  db.close();
  process.exit(1);
});
