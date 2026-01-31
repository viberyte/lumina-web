import Database from 'better-sqlite3';
import fetch from 'node-fetch';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const apifyUrl = 'https://api.apify.com/v2/datasets/zauOmco1liyWW11iY/items?token=apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW';

async function main() {
  console.log('Downloading Apify dataset...');
  const response = await fetch(apifyUrl);
  const apifyData = await response.json();
  
  console.log(`Downloaded ${apifyData.length} items from Apify`);
  
  // Filter out errors
  const validData = apifyData.filter(item => !item.error);
  console.log(`Valid items (no errors): ${validData.length}`);
  console.log('');
  
  const db = new Database(dbPath);
  
  console.log('Step 1: Checking for duplicates in database...');
  const duplicates = db.prepare(`
    SELECT media_url, COUNT(*) as count
    FROM venue_instagram_media
    GROUP BY media_url
    HAVING count > 1
  `).all();
  
  console.log(`Found ${duplicates.length} duplicate media URLs`);
  
  if (duplicates.length > 0) {
    console.log('Removing duplicates (keeping first occurrence)...');
    let totalDeleted = 0;
    for (const dup of duplicates) {
      const records = db.prepare(`
        SELECT id FROM venue_instagram_media 
        WHERE media_url = ?
        ORDER BY id
      `).all(dup.media_url);
      
      const idsToDelete = records.slice(1).map(r => r.id);
      if (idsToDelete.length > 0) {
        db.prepare(`
          DELETE FROM venue_instagram_media 
          WHERE id IN (${idsToDelete.join(',')})
        `).run();
        totalDeleted += idsToDelete.length;
      }
    }
    console.log(`  Deleted ${totalDeleted} total duplicate records`);
  }
  
  console.log('');
  console.log('Step 2: Building venue lookup...');
  const venues = db.prepare(`
    SELECT id, instagram_handle, name
    FROM venues
    WHERE instagram_handle IS NOT NULL 
      AND instagram_handle != ''
      AND should_exclude = 0
  `).all();
  
  const venueMap = new Map();
  venues.forEach(v => {
    const handle = v.instagram_handle.toLowerCase().replace('@', '').trim();
    venueMap.set(handle, v);
  });
  
  console.log(`Loaded ${venueMap.size} venues with Instagram handles`);
  
  console.log('');
  console.log('Step 3: Processing Apify data...');
  
  let matched = 0;
  let unmatched = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO venue_instagram_media 
    (venue_id, media_url, media_type, posted_at)
    VALUES (?, ?, ?, ?)
  `);
  
  const checkExistsStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM venue_instagram_media 
    WHERE venue_id = ? AND media_url = ?
  `);
  
  for (const item of validData) {
    try {
      const handle = item.ownerUsername?.toLowerCase().replace('@', '').trim();
      
      if (!handle) {
        unmatched++;
        continue;
      }
      
      const venue = venueMap.get(handle);
      if (!venue) {
        unmatched++;
        continue;
      }
      
      matched++;
      
      // Determine media type and URL
      const mediaType = item.type === 'Video' || item.videoUrl ? 'video' : 'image';
      const mediaUrl = item.videoUrl || item.displayUrl || item.url;
      
      // Check if already exists
      const exists = checkExistsStmt.get(venue.id, mediaUrl);
      if (exists.count > 0) {
        skipped++;
        continue;
      }
      
      const result = insertStmt.run(
        venue.id,
        mediaUrl,
        mediaType,
        item.timestamp || new Date().toISOString()
      );
      
      if (result.changes > 0) {
        inserted++;
        if (inserted % 100 === 0) {
          console.log(`  Inserted ${inserted} new media items...`);
        }
      }
      
    } catch (error) {
      errors++;
      if (errors < 10) {
        console.error(`Error: ${error.message}`);
      }
    }
  }
  
  db.close();
  
  console.log('');
  console.log('='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log(`Apify valid items: ${validData.length}`);
  console.log(`Matched to venues: ${matched}`);
  console.log(`Unmatched handles: ${unmatched}`);
  console.log(`New items inserted: ${inserted}`);
  console.log(`Already existed (skipped): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('='.repeat(60));
  
  const finalDb = new Database(dbPath);
  const stats = finalDb.prepare(`
    SELECT 
      COUNT(*) as total_media,
      COUNT(DISTINCT venue_id) as venues_with_media,
      COUNT(CASE WHEN media_type = 'video' THEN 1 END) as videos,
      COUNT(CASE WHEN media_type = 'image' THEN 1 END) as images,
      COUNT(CASE WHEN media_url LIKE '/media/instagram/%' THEN 1 END) as local_files,
      COUNT(CASE WHEN media_url LIKE 'https://%' THEN 1 END) as external_urls
    FROM venue_instagram_media
  `).get();
  
  console.log('');
  console.log('FINAL DATABASE STATS:');
  console.log(`Total media items: ${stats.total_media}`);
  console.log(`Venues with media: ${stats.venues_with_media}`);
  console.log(`Videos: ${stats.videos}`);
  console.log(`Images: ${stats.images}`);
  console.log(`Local files: ${stats.local_files}`);
  console.log(`External URLs: ${stats.external_urls}`);
  
  finalDb.close();
}

main().catch(console.error);
