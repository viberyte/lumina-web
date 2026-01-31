import Database from 'better-sqlite3';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const outputDir = '/opt/viberyte/lumina-web/public/media/instagram';
const PARALLEL_DOWNLOADS = 10; // Download 10 files at once

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function getNextFileNumber() {
  const files = fs.readdirSync(outputDir);
  const numbers = files.map(f => parseInt(f.split('.')[0])).filter(n => !isNaN(n));
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

let currentFileNumber = getNextFileNumber();
let fileNumberLock = false;

function getAndIncrementFileNumber() {
  while (fileNumberLock) {} // Simple spinlock
  fileNumberLock = true;
  const num = currentFileNumber++;
  fileNumberLock = false;
  return num;
}

async function downloadFile(url, outputPath, retries = 2) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const attemptDownload = (attempt) => {
      const file = fs.createWriteStream(outputPath);
      
      protocol.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 20000
      }, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(true);
          });
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          fs.unlinkSync(outputPath);
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            downloadFile(redirectUrl, outputPath, retries).then(resolve).catch(reject);
          } else {
            reject(new Error(`Redirect without location`));
          }
        } else {
          file.close();
          fs.unlinkSync(outputPath);
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        if (attempt < retries) {
          setTimeout(() => attemptDownload(attempt + 1), 500);
        } else {
          reject(err);
        }
      }).on('timeout', () => {
        file.close();
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(new Error('Timeout'));
      });
    };
    
    attemptDownload(0);
  });
}

function getExtension(url, isVideo = false) {
  if (url.includes('.mp4') || url.includes('video') || isVideo) return 'mp4';
  if (url.includes('.jpg') || url.includes('.jpeg')) return 'jpg';
  return 'jpg';
}

async function downloadBatch(batch, db) {
  const results = await Promise.allSettled(
    batch.map(async (media) => {
      const extension = getExtension(media.media_url, media.media_type === 'video');
      const fileNumber = getAndIncrementFileNumber();
      const filename = `${fileNumber}.${extension}`;
      const outputPath = path.join(outputDir, filename);
      const localPath = `/media/instagram/${filename}`;
      
      if (fs.existsSync(outputPath)) {
        return { status: 'skipped', id: media.id };
      }
      
      await downloadFile(media.media_url, outputPath);
      
      db.prepare(`UPDATE venue_instagram_media SET media_url = ? WHERE id = ?`).run(localPath, media.id);
      
      return { status: 'success', id: media.id, size: fs.statSync(outputPath).size };
    })
  );
  
  return results;
}

async function main() {
  const db = new Database(dbPath);
  
  const externalMedia = db.prepare(`
    SELECT id, venue_id, media_url, media_type
    FROM venue_instagram_media
    WHERE media_url LIKE 'https://%'
    ORDER BY id
  `).all();
  
  console.log(`Found ${externalMedia.length} external Instagram media to download`);
  console.log(`Downloading ${PARALLEL_DOWNLOADS} files in parallel`);
  console.log('');
  
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < externalMedia.length; i += PARALLEL_DOWNLOADS) {
    const batch = externalMedia.slice(i, i + PARALLEL_DOWNLOADS);
    const results = await downloadBatch(batch, db);
    
    results.forEach((result, idx) => {
      const progress = `[${i + idx + 1}/${externalMedia.length}]`;
      if (result.status === 'fulfilled') {
        if (result.value.status === 'success') {
          downloaded++;
          const sizeMB = (result.value.size / 1024 / 1024).toFixed(2);
          console.log(`${progress} ✅ Success (${sizeMB} MB)`);
        } else if (result.value.status === 'skipped') {
          skipped++;
        }
      } else {
        failed++;
        console.log(`${progress} ❌ Failed: ${result.reason?.message || 'Unknown'}`);
      }
    });
    
    if ((i + PARALLEL_DOWNLOADS) % 100 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = downloaded / elapsed;
      const remaining = externalMedia.length - (i + PARALLEL_DOWNLOADS);
      const eta = remaining / rate / 60;
      console.log(`\nProgress: ${downloaded} downloaded, ${failed} failed, ${skipped} skipped`);
      console.log(`Rate: ${rate.toFixed(1)} files/sec | ETA: ${eta.toFixed(0)} minutes\n`);
    }
  }
  
  db.close();
  
  console.log('');
  console.log('='.repeat(60));
  console.log('DOWNLOAD COMPLETE');
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total time: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`);
  console.log('='.repeat(60));
}

main().catch(console.error);
