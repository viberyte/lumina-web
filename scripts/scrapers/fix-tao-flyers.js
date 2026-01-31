import https from 'https';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const FLYER_DIR = '/opt/viberyte/lumina-web/public/event-flyers';

// Get TAO events with venue photos (not real flyers)
const events = db.prepare(`
  SELECT id, name, ticket_url 
  FROM events 
  WHERE image_url LIKE '/venue-photos/%'
  AND source_type = 'tao'
  AND ticket_url IS NOT NULL 
  AND ticket_url != ''
  AND ticket_url LIKE 'https://%'
`).all();

console.log(`Found ${events.length} TAO events with venue photos`);

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    };
    
    const req = https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let newUrl = res.headers.location;
        if (newUrl.startsWith('/')) newUrl = `https://${urlObj.hostname}${newUrl}`;
        fetchPage(newUrl).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    };
    
    const req = https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(filepath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function processEvent(event) {
  try {
    console.log(`Processing: ${event.name} (ID: ${event.id})`);
    
    const html = await fetchPage(event.ticket_url);
    
    // Look for og:image
    const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                    html.match(/content="([^"]+)"\s+property="og:image"/i);
    
    if (ogMatch && ogMatch[1]) {
      const imageUrl = ogMatch[1];
      
      // Skip if it's a generic logo/favicon
      if (imageUrl.includes('favicon') || imageUrl.includes('logo') && imageUrl.length < 100) {
        console.log(`  ⚠️ Skipped: Generic logo`);
        return false;
      }
      
      console.log(`  Found: ${imageUrl.substring(0, 70)}...`);
      
      // Download
      const ext = imageUrl.includes('.png') ? '.png' : imageUrl.includes('.webp') ? '.webp' : '.jpg';
      const filename = `event_${event.id}${ext}`;
      const filepath = path.join(FLYER_DIR, filename);
      
      await downloadImage(imageUrl, filepath);
      
      // Update DB
      const localPath = `/event-flyers/${filename}`;
      db.prepare('UPDATE events SET image_url = ? WHERE id = ?').run(localPath, event.id);
      console.log(`  ✅ Saved`);
      return true;
    } else {
      console.log(`  ❌ No og:image found`);
      return false;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  let fixed = 0, failed = 0;
  const seen = new Set();
  
  for (const event of events) {
    // Skip duplicate URLs
    if (seen.has(event.ticket_url)) {
      console.log(`Skipping duplicate: ${event.ticket_url}`);
      continue;
    }
    seen.add(event.ticket_url);
    
    const success = await processEvent(event);
    if (success) fixed++;
    else failed++;
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n=== DONE ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Failed: ${failed}`);
}

main();
