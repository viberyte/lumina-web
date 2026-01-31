import Database from 'better-sqlite3';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const outputDir = '/opt/viberyte/lumina-web/public/media/instagram';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function getNextFileNumber() {
  const files = fs.readdirSync(outputDir);
  const numbers = files
    .map(f => parseInt(f.split('.')[0]))
    .filter(n => !isNaN(n));
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

let currentFileNumber = getNextFileNumber();

async function downloadFile(url, outputPath, retries = 3) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const attemptDownload = (attempt) => {
      const file = fs.createWriteStream(outputPath);
      
      protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
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
            reject(new Error(`Redirect without location: ${response.statusCode}`));
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
          console.log(`    Retry ${attempt + 1}/${retries}...`);
          setTimeout(() => attemptDownload(attempt + 1), 1000 * attempt);
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
  if (url.includes('.png')) return 'png';
  return 'jpg';
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
  console.log(`Starting from file number: ${currentFileNumber}`);
  console.log('');
  
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < externalMedia.length; i++) {
    const media = externalMedia[i];
    const progress = `[${i + 1}/${externalMedia.length}]`;
    
    try {
      const extension = getExtension(media.media_url, media.media_type === 'video');
      const filename = `${currentFileNumber}.${extension}`;
      const outputPath = path.join(outputDir, filename);
      const localPath = `/media/instagram/${filename}`;
      
      if (fs.existsSync(outputPath)) {
        console.log(`${progress} SKIP: ${filename} (already exists)`);
        skipped++;
        currentFileNumber++;
        continue;
      }
      
      console.log(`${progress} Downloading: ${filename} (${media.media_type})`);
      
      await downloadFile(media.media_url, outputPath);
      
      db.prepare(`
        UPDATE venue_instagram_media 
        SET media_url = ? 
        WHERE id = ?
      `).run(localPath, media.id);
      
      downloaded++;
      currentFileNumber++;
      
      console.log(`  ✅ Success: ${filename} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
      
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      failed++;
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }
  
  db.close();
  
  console.log('');
  console.log('='.repeat(60));
  console.log('DOWNLOAD COMPLETE');
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total files in directory: ${fs.readdirSync(outputDir).length}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
