const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const PHOTO_DIR = '/mnt/HC_Volume_104366905/instagram-photos';
const VIDEO_DIR = '/mnt/HC_Volume_104366905/instagram-videos';

const venues = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/data/venues_to_import.json', 'utf8'));

console.log(`MEDIA DOWNLOADER (Resilient)\n`);
console.log(`Venues: ${venues.length}`);
console.log(`Photo dir: ${PHOTO_DIR}`);
console.log(`Video dir: ${VIDEO_DIR}\n`);

let photoCount = 0, videoCount = 0, errors = 0, skipped = 0;

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) {
      return reject(new Error('Invalid URL'));
    }
    
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 20000);
    
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    const req = protocol.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000 
    }, (response) => {
      clearTimeout(timeout);
      
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    
    req.on('error', (err) => {
      clearTimeout(timeout);
      file.close();
      fs.unlink(filepath, () => {});
      reject(err);
    });
    
    req.on('timeout', () => {
      clearTimeout(timeout);
      req.destroy();
      file.close();
      fs.unlink(filepath, () => {});
      reject(new Error('Request timeout'));
    });
  });
}

async function processVenue(venue, index) {
  const handle = venue.instagram_handle;
  if (!handle) return;
  
  const label = `[${index + 1}/${venues.length}] @${handle.padEnd(25)}`;
  process.stdout.write(`${label}`);
  
  let downloaded = 0;
  
  // Photos
  const photos = venue.ig_photos || [];
  for (let i = 0; i < Math.min(photos.length, 5); i++) {
    const url = photos[i];
    const filename = `${handle}_${i + 1}.jpg`;
    const filepath = path.join(PHOTO_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      skipped++;
      downloaded++;
      continue;
    }
    
    try {
      await downloadFile(url, filepath);
      downloaded++;
      photoCount++;
    } catch (e) {
      errors++;
    }
  }
  
  // Videos
  const videos = venue.ig_videos || [];
  for (let i = 0; i < Math.min(videos.length, 2); i++) {
    const url = videos[i];
    const filename = `${handle}_${i + 1}.mp4`;
    const filepath = path.join(VIDEO_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      skipped++;
      downloaded++;
      continue;
    }
    
    try {
      await downloadFile(url, filepath);
      downloaded++;
      videoCount++;
    } catch (e) {
      errors++;
    }
  }
  
  console.log(` ✅ ${downloaded} files`);
}

async function run() {
  for (let i = 0; i < venues.length; i++) {
    try {
      await processVenue(venues[i], i);
    } catch (e) {
      console.log(` ❌ ERROR: ${e.message}`);
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`\n  💾 Progress: ${photoCount} photos, ${videoCount} videos, ${errors} errors\n`);
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  DOWNLOAD COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`📷 Photos: ${photoCount}`);
  console.log(`🎬 Videos: ${videoCount}`);
  console.log(`⏭️ Skipped (already exist): ${skipped}`);
  console.log(`⚠️ Errors: ${errors}`);
}

run().catch(e => { console.error('FATAL:', e.message); });
