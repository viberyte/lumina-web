import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const IMAGE_DIR = '/opt/viberyte/lumina-web/public/event-flyers';

// Create directory if not exists
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': url.includes('ra.co') ? 'https://ra.co/' : 
                   url.includes('posh') ? 'https://posh.vip/' : '',
        'Accept': 'image/*,*/*;q=0.8',
      }
    };
    
    protocol.get(url, options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filename).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const file = fs.createWriteStream(filename);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filename);
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadAllImages() {
  console.log('🖼️ DOWNLOADING EVENT FLYERS\n');
  
  // Get events with external image URLs (RA, POSH)
  const events = db.prepare(`
    SELECT id, name, image_url 
    FROM events 
    WHERE event_date >= date('now')
      AND image_url IS NOT NULL 
      AND image_url != ''
      AND image_url LIKE 'http%'
      AND image_url NOT LIKE '%unsplash%'
      AND image_url NOT LIKE '/event-flyers/%'
    LIMIT 5000
  `).all();
  
  console.log(`Found ${events.length} events with external images\n`);
  
  const updateStmt = db.prepare(`UPDATE events SET image_url = ? WHERE id = ?`);
  
  let downloaded = 0;
  let failed = 0;
  
  for (const e of events) {
    try {
      // Generate filename from event ID
      const ext = e.image_url.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
      const filename = `event_${e.id}.${ext}`;
      const filepath = path.join(IMAGE_DIR, filename);
      const publicPath = `/event-flyers/${filename}`;
      
      // Skip if already downloaded
      if (fs.existsSync(filepath)) {
        updateStmt.run(publicPath, e.id);
        downloaded++;
        continue;
      }
      
      await downloadImage(e.image_url, filepath);
      updateStmt.run(publicPath, e.id);
      downloaded++;
      
      if (downloaded % 20 === 0) {
        console.log(`   ✅ Downloaded ${downloaded}/${events.length}...`);
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 100));
      
    } catch (err) {
      failed++;
      // Keep original URL or use placeholder
    }
  }
  
  console.log(`\n✅ Downloaded: ${downloaded}`);
  console.log(`❌ Failed: ${failed}`);
  
  // Check final stats
  const stats = db.prepare(`
    SELECT 
      SUM(CASE WHEN image_url LIKE '/event-flyers/%' THEN 1 ELSE 0 END) as local,
      SUM(CASE WHEN image_url LIKE 'http%' THEN 1 ELSE 0 END) as external
    FROM events WHERE event_date >= date('now')
  `).get();
  
  console.log(`\n📊 Local images: ${stats.local}`);
  console.log(`📊 External images: ${stats.external}`);
  
  db.close();
}

downloadAllImages().catch(console.error);
