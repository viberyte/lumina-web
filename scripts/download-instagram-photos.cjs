const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const https = require('https');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const photoDir = '/mnt/HC_Volume_104366905/venue-photos';

// Get venues with Instagram URLs but missing local photos
const venues = db.prepare(`
  SELECT id, name, gallery_photos
  FROM venues 
  WHERE should_exclude = 0 
    AND gallery_photos LIKE '%instagram%'
  ORDER BY id
`).all();

console.log(`Found ${venues.length} venues with Instagram URLs`);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, { 
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, response => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(dest);
        if (stats.size < 5000) {
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
    });
  });
}

function parsePhotos(json) {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter(u => u && typeof u === 'string' && u.includes('instagram')) : [];
  } catch {
    return [];
  }
}

async function processVenue(venue) {
  // Check both naming patterns
  const dashPath = path.join(photoDir, `venue-${venue.id}-1.jpg`);
  const underscorePath = path.join(photoDir, `venue_${venue.id}_1.jpg`);
  
  if (fs.existsSync(dashPath) && fs.statSync(dashPath).size > 5000) return 'exists';
  if (fs.existsSync(underscorePath) && fs.statSync(underscorePath).size > 5000) return 'exists';
  
  const photos = parsePhotos(venue.gallery_photos);
  if (photos.length === 0) return 'no_urls';
  
  for (const url of photos.slice(0, 3)) {
    try {
      await downloadFile(url, underscorePath);
      return 'downloaded';
    } catch (err) {
      // Try next
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
      if (failed <= 30) console.log(`[${i+1}/${venues.length}] ❌ ${venue.name}`);
    }
    
    if (result === 'downloaded') await new Promise(r => setTimeout(r, 150));
    
    if ((i + 1) % 100 === 0) {
      console.log(`\n--- ${i+1}/${venues.length} | ✅ ${downloaded} | ❌ ${failed} | ⏭️ ${exists} ---\n`);
    }
  }
  
  console.log('\n=== DONE ===');
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Existed: ${exists}`);
  console.log(`Failed: ${failed}`);
  console.log(`No URLs: ${noUrls}`);
}

main().catch(console.error);
