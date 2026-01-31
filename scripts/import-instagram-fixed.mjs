import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const PHOTOS_URL = 'https://api.apify.com/v2/datasets/cIiN7p0mR484jBHg7/items?token=apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW';
const REELS_URL = 'https://api.apify.com/v2/datasets/zauOmco1liyWW11iY/items?token=apify_api_zBYgRbs71FsftdbViSgE7n79YyWv793cP1dW';

async function importDataset(url, type) {
  console.log(`Fetching ${type} dataset...`);
  const response = await fetch(url);
  const items = await response.json();
  
  console.log(`Processing ${items.length} ${type}...`);
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO venue_instagram_media (
      venue_id, post_id, media_type, media_url, thumbnail_url,
      caption, likes, comments, posted_at, instagram_handle, instagram_permalink
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const getVenueStmt = db.prepare(`
    SELECT id FROM venues WHERE LOWER(instagram_handle) = LOWER(?)
  `);

  let imported = 0;
  let skipped = 0;
  let noPostId = 0;
  let noVenue = 0;

  for (const item of items) {
    const postId = item.id || item.shortCode;
    if (!postId) {
      noPostId++;
      continue;
    }

    const ownerUsername = item.ownerUsername?.replace('@', '').trim();
    if (!ownerUsername) {
      skipped++;
      continue;
    }

    const venue = getVenueStmt.get(ownerUsername);
    if (!venue) {
      noVenue++;
      continue;
    }

    try {
      const result = insertStmt.run(
        venue.id,
        postId,
        type,
        item.displayUrl || item.url,
        item.thumbnailUrl || item.displayUrl,
        item.caption || '',
        item.likesCount || 0,
        item.commentsCount || 0,
        item.timestamp || new Date().toISOString(),
        ownerUsername,
        item.url || `https://instagram.com/p/${item.shortCode}`
      );
      
      if (result.changes > 0) {
        imported++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Error importing ${postId}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`${type}: ${imported} imported`);
  console.log(`  Duplicates: ${skipped}`);
  console.log(`  Missing post_id: ${noPostId}`);
  console.log(`  No venue match: ${noVenue}`);
  return imported;
}

async function main() {
  try {
    console.log('Starting Instagram import...\n');
    const photosImported = await importDataset(PHOTOS_URL, 'image');
    const reelsImported = await importDataset(REELS_URL, 'video');
    
    console.log(`\n✅ Total imported: ${photosImported + reelsImported}`);
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(DISTINCT post_id) as unique_posts,
        COUNT(DISTINCT venue_id) as venues_with_media
      FROM venue_instagram_media
    `).get();
    
    console.log(`\nDatabase stats:`);
    console.log(`  Total rows: ${stats.total_rows}`);
    console.log(`  Unique posts: ${stats.unique_posts}`);
    console.log(`  Venues with media: ${stats.venues_with_media}`);
    
    db.close();
  } catch (error) {
    console.error('Import error:', error);
    db.close();
    process.exit(1);
  }
}

main();
