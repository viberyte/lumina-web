const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const photoDir = '/opt/viberyte/lumina-web/public/venue-photos';

// Get venues missing photos
const venues = db.prepare(`
  SELECT id, name, gallery_photos, google_photos
  FROM venues 
  WHERE should_exclude = 0 AND id > 10687
  ORDER BY id
`).all();

console.log(`Found ${venues.length} venues to check`);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    
    const request = client.get(url, { 
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, response => {
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
        resolve(true);
      });
    });
    
    request.on('error', err => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
    
    request.on('timeout', () => {
      request.destroy();
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
  
  // Skip if already exists
  if (fs.existsSync(destPath)) {
    return 'exists';
  }
  
  // Try gallery_photos first, then google_photos
  const photos = [
    ...parsePhotos(venue.gallery_photos),
    ...parsePhotos(venue.google_photos)
  ];
  
  if (photos.length === 0) {
    return 'no_urls';
  }
  
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
      console.log(`[${i+1}/${venues.length}] ❌ ${venue.name}`);
    }
    
    // Rate limit
    if (result === 'downloaded') {
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Progress every 100
    if ((i + 1) % 100 === 0) {
      console.log(`\n--- Progress: ${i+1}/${venues.length} | ✅ ${downloaded} | ❌ ${failed} | ⏭️ ${exists} | 🚫 ${noUrls} ---\n`);
    }
  }
  
  console.log('\n=== DONE ===');
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Already existed: ${exists}`);
  console.log(`Failed: ${failed}`);
  console.log(`No URLs: ${noUrls}`);
}

main().catch(console.error);
