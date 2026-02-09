const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const https = require('https');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const photoDir = '/mnt/HC_Volume_104366905/venue-photos';

// Get venues missing photos (ID > 10687)
const venues = db.prepare(`
  SELECT id, name, google_photos
  FROM venues 
  WHERE should_exclude = 0 
    AND id > 10687
    AND google_photos IS NOT NULL 
    AND google_photos != '[]'
  ORDER BY id
`).all();

console.log(`Found ${venues.length} venues with Google photo URLs to download`);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, { 
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, response => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        // Check file size
        const stats = fs.statSync(dest);
        if (stats.size < 1000) {
          fs.unlinkSync(dest);
          reject(new Error('File too small'));
        } else {
          resolve(true);
        }
      });
    }).on('error', err => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    }).on('timeout', () => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(new Error('timeout'));
    });
  });
}

function parsePhotos(json) {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter(u => u && typeof u === 'string') : [];
  } catch {
    return [];
  }
}

async function processVenue(venue) {
  const destPath = path.join(photoDir, `venue-${venue.id}-1.jpg`);
  
  if (fs.existsSync(destPath)) {
    const stats = fs.statSync(destPath);
    if (stats.size > 1000) return 'exists';
    fs.unlinkSync(destPath); // Remove empty file
  }
  
  const photos = parsePhotos(venue.google_photos);
  if (photos.length === 0) return 'no_urls';
  
  for (const url of photos.slice(0, 3)) {
    try {
      await downloadFile(url, destPath);
      return 'downloaded';
    } catch (err) {
      // Try next URL
    }
  }
  
  return 'failed';
}

async function main() {
  let downloaded = 0, exists = 0, failed = 0, noUrls = 0;
  
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    const result = await processVenue(venue);
    
    if (result === 'downloaded') {
      downloaded++;
      console.log(`[${i+1}/${venues.length}] ✅ ${venue.name}`);
    } else if (result === 'exists') {
      exists++;
    } else if (result === 'no_urls') {
      noUrls++;
    } else {
      failed++;
      if (failed <= 20) console.log(`[${i+1}/${venues.length}] ❌ ${venue.name}`);
    }
    
    if (result === 'downloaded') {
      await new Promise(r => setTimeout(r, 100));
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`\n--- Progress: ${i+1}/${venues.length} | ✅ ${downloaded} | ❌ ${failed} | ⏭️ ${exists} ---\n`);
    }
  }
  
  console.log('\n=== DONE ===');
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Already existed: ${exists}`);
  console.log(`Failed: ${failed}`);
  console.log(`No URLs: ${noUrls}`);
}

main().catch(console.error);
