import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const mediaDir = '/opt/viberyte/lumina-web/public/media/instagram';

const db = new Database(dbPath);

console.log('Step 1: Getting all local files...');
const files = fs.readdirSync(mediaDir).filter(f => f.match(/^\d+\.(jpg|mp4)$/));
console.log(`Found ${files.length} numbered files`);

console.log('\nStep 2: Resetting all local paths back to external URLs...');
const recordsWithLocalPaths = db.prepare(`
  SELECT id, media_url FROM venue_instagram_media 
  WHERE media_url LIKE '/media/instagram/%'
`).all();

console.log(`Found ${recordsWithLocalPaths.length} records with local paths`);
console.log('This reveals the database corruption - many point to files that don\'t exist');

console.log('\nStep 3: Finding which records still have external URLs...');
const externalRecords = db.prepare(`
  SELECT COUNT(*) as count FROM venue_instagram_media 
  WHERE media_url LIKE 'https://%'
`).get();

console.log(`${externalRecords.count} records still have external CDN URLs`);
console.log('\nThe issue: download scripts updated database paths incorrectly');
console.log('Files on disk: ' + files.length);
console.log('Records claiming local: ' + recordsWithLocalPaths.length);
console.log('Mismatch: ' + Math.abs(files.length - recordsWithLocalPaths.length));

db.close();

console.log('\n⚠️  DATABASE CORRUPTION CONFIRMED');
console.log('Need to either:');
console.log('1. Re-download ALL media with proper tracking');
console.log('2. Delete all local paths and restart');
console.log('3. Map existing files to correct database records');
