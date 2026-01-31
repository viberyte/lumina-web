import Database from 'better-sqlite3';

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const db = new Database(DB_PATH);

// Get one venue's TikTok data to inspect
const venue = db.prepare(`
  SELECT id, name, tiktok_videos 
  FROM venues 
  WHERE id = 425
`).get();

console.log('Venue:', venue.name);
console.log('\n=== FULL VIDEO DATA ===\n');

const videos = JSON.parse(venue.tiktok_videos);
console.log(JSON.stringify(videos[0], null, 2)); // First video, fully formatted

db.close();
