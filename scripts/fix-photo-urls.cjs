const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const photoDir = '/opt/viberyte/lumina-web/public/venue-photos';

const files = fs.readdirSync(photoDir);
const venuePhotos = new Map();

files.forEach(f => {
  const match = f.match(/venue-(\d+)-(\d+)\.jpg/);
  if (match) {
    const id = parseInt(match[1]);
    if (!venuePhotos.has(id)) {
      venuePhotos.set(id, '/venue-photos/venue-' + id + '-1.jpg');
    }
  }
});

console.log('Found photos for', venuePhotos.size, 'venues');

const stmt = db.prepare('UPDATE venues SET image_url = ? WHERE id = ?');
let updated = 0;

for (const [id, url] of venuePhotos) {
  const result = stmt.run(url, id);
  if (result.changes > 0) updated++;
}

console.log('Updated', updated, 'venues with local photo paths');
db.close();
