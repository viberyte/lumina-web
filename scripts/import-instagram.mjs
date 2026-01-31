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
    SELECT id FROM venues WHERE instagram_handle = ?
  `);

  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    const ownerUsername = item.ownerUsername?.replace('@', '');
    if (!ownerUsername) {
      skipped++;
      continue;
    }

    const venue = getVenueStmt.get(ownerUsername);
    if (!venue) {
      console.log(`No venue found for @${ownerUsername}`);
      skipped++;
      continue;
    }

    try {
      insertStmt.run(
        venue.id,
        item.id || item.shortCode,
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
      imported++;
    } catch (err) {
      if (!err.message.includes('UNIQUE constraint')) {
        console.error(`Error importing ${item.shortCode}: ${err.message}`);
      }
      skipped++;
    }
  }

  console.log(`${type}: ${imported} imported, ${skipped} skipped`);
  return imported;
}

async function main() {
  try {
    console.log('Starting Instagram import...\n');
    const photosImported = await importDataset(PHOTOS_URL, 'image');
    const reelsImported = await importDataset(REELS_URL, 'video');
    
    console.log(`\n✅ Total imported: ${photosImported + reelsImported}`);
    console.log('Ready for AI analysis!');
    
    db.close();
  } catch (error) {
    console.error('Import error:', error);
    db.close();
    process.exit(1);
  }
}

main();
