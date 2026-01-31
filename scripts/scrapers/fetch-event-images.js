import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('🖼️ FETCH MISSING EVENT IMAGES\n');

// Step 1: Use venue images as fallback for events without images
console.log('Step 1: Copy venue images to events...');

const venueImageFix = db.prepare(`
  UPDATE events 
  SET image_url = (
    SELECT COALESCE(v.professional_photo_url, v.image_url, v.google_photos)
    FROM venues v 
    WHERE v.id = events.venue_id
    AND (v.professional_photo_url IS NOT NULL OR v.image_url IS NOT NULL OR v.google_photos IS NOT NULL)
  )
  WHERE (image_url IS NULL OR image_url = '')
    AND venue_id IS NOT NULL
    AND event_date >= date('now')
`);

const result1 = venueImageFix.run();
console.log(`   ✅ Updated ${result1.changes} events with venue photos\n`);

// Step 2: For RA events, construct image URL from event page
console.log('Step 2: Construct RA event images...');

const raEvents = db.prepare(`
  SELECT id, ticket_url FROM events 
  WHERE source_type = 'resident_advisor' 
    AND (image_url IS NULL OR image_url = '')
    AND event_date >= date('now')
    AND ticket_url IS NOT NULL
`).all();

console.log(`   Found ${raEvents.length} RA events without images`);

// RA image pattern: https://ra.co/images/events/flyer/EVENTID/lg/image.jpg
const updateImage = db.prepare(`UPDATE events SET image_url = ? WHERE id = ?`);

let raUpdated = 0;
for (const e of raEvents) {
  // Extract event ID from URL like https://ra.co/events/1234567
  const match = e.ticket_url?.match(/ra\.co\/events\/(\d+)/);
  if (match) {
    const eventId = match[1];
    const imageUrl = `https://ra.co/images/events/flyer/${eventId}/lg/image.jpg`;
    updateImage.run(imageUrl, e.id);
    raUpdated++;
  }
}
console.log(`   ✅ Updated ${raUpdated} RA events with flyer URLs\n`);

// Step 3: For TAO events, use venue images
console.log('Step 3: TAO events - use venue photos...');

const taoFix = db.prepare(`
  UPDATE events 
  SET image_url = 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800'
  WHERE source_type = 'tao'
    AND (image_url IS NULL OR image_url = '')
    AND event_date >= date('now')
`);

const result3 = taoFix.run();
console.log(`   ✅ Updated ${result3.changes} TAO events\n`);

// Step 4: For DICE events, try to get from their CDN
console.log('Step 4: DICE/Shotgun events - placeholder...');

const diceFix = db.prepare(`
  UPDATE events 
  SET image_url = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800'
  WHERE source_type IN ('dice', 'shotgun', 'apify-crawl')
    AND (image_url IS NULL OR image_url = '')
    AND event_date >= date('now')
`);

const result4 = diceFix.run();
console.log(`   ✅ Updated ${result4.changes} DICE/Shotgun events\n`);

// Final stats
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 ELSE 0 END) as with_images
  FROM events WHERE event_date >= date('now')
`).get();

console.log('📊 FINAL STATS:');
console.log(`   Total upcoming events: ${stats.total}`);
console.log(`   Events with images: ${stats.with_images}`);
console.log(`   Coverage: ${Math.round(stats.with_images / stats.total * 100)}%`);

db.close();
