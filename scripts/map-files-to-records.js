import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const mediaDir = '/mnt/HC_Volume_104366905/lumina-media/instagram';

const db = new Database(dbPath);

console.log('MAPPING EXISTING FILES TO DATABASE RECORDS\n');

// Get all files
const allFiles = fs.readdirSync(mediaDir);
const apifyFiles = allFiles.filter(f => f.startsWith('apify_'));
const numberedFiles = allFiles.filter(f => f.match(/^\d+\.(jpg|mp4)$/));

console.log(`Found ${apifyFiles.length} apify files`);
console.log(`Found ${numberedFiles.length} numbered files`);
console.log('');

// Build a Set of existing file paths
const existingPaths = new Set(
  allFiles.map(f => `/media/instagram/${f}`)
);

console.log('Step 1: Checking database integrity...');

const dbStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN media_url LIKE '/media/instagram/%' THEN 1 END) as local,
    COUNT(CASE WHEN media_url LIKE 'https://%' THEN 1 END) as external
  FROM venue_instagram_media
`).get();

console.log(`Total records: ${dbStats.total}`);
console.log(`Records with local paths: ${dbStats.local}`);
console.log(`Records with external URLs: ${dbStats.external}`);
console.log('');

// Find broken records (local path but no file)
console.log('Step 2: Finding broken records...');

const localRecords = db.prepare(`
  SELECT id, media_url 
  FROM venue_instagram_media 
  WHERE media_url LIKE '/media/instagram/%'
`).all();

const brokenRecords = localRecords.filter(r => !existingPaths.has(r.media_url));
const validRecords = localRecords.filter(r => existingPaths.has(r.media_url));

console.log(`Valid records (file exists): ${validRecords.length}`);
console.log(`Broken records (no file): ${brokenRecords.length}`);
console.log('');

if (brokenRecords.length > 0) {
  console.log('Step 3: Deleting broken records...');
  const deleteStmt = db.prepare('DELETE FROM venue_instagram_media WHERE id = ?');
  
  let deleted = 0;
  for (const record of brokenRecords) {
    deleteStmt.run(record.id);
    deleted++;
    if (deleted % 1000 === 0) {
      console.log(`  Deleted ${deleted}/${brokenRecords.length}...`);
    }
  }
  console.log(`  ✅ Deleted ${deleted} broken records`);
  console.log('');
}

// Final verification
const finalStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN media_url LIKE '/media/instagram/%' THEN 1 END) as local,
    COUNT(CASE WHEN media_url LIKE 'https://%' THEN 1 END) as external
  FROM venue_instagram_media
`).get();

db.close();

console.log('='.repeat(60));
console.log('FINAL STATE:');
console.log(`Files on disk: ${allFiles.length}`);
console.log(`Database total: ${finalStats.total}`);
console.log(`Database local: ${finalStats.local}`);
console.log(`Database external: ${finalStats.external}`);
console.log('');

if (finalStats.local === allFiles.length) {
  console.log('✅ PERFECT MATCH - Every database record has a file!');
} else if (finalStats.local < allFiles.length) {
  console.log(`✅ DATABASE CLEAN - ${allFiles.length - finalStats.local} orphaned files on disk (OK)`);
} else {
  console.log(`⚠️  ${finalStats.local - allFiles.length} records still have no files`);
}
console.log('='.repeat(60));
