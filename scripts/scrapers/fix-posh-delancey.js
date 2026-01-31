import https from 'https';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const FLYER_DIR = '/opt/viberyte/lumina-web/public/event-flyers';

// Get events with no image but have posh ticket URLs
const events = db.prepare(`
  SELECT id, name, ticket_url 
  FROM events 
  WHERE (image_url IS NULL OR image_url = '')
  AND ticket_url LIKE '%posh.vip%'
`).all();

console.log(`Found ${events.length} POSH events without images`);

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchPage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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
    console.log(`\nProcessing: ${event.name.substring(0, 50)}...`);
    console.log(`  URL: ${event.ticket_url}`);
    
    const html = await fetchPage(event.ticket_url);
    
    // Look for og:image or cover image
    const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                    html.match(/content="([^"]+)"\s+property="og:image"/i) ||
                    html.match(/"coverUrl":"([^"]+)"/);
    
    if (ogMatch && ogMatch[1]) {
      let imageUrl = ogMatch[1].replace(/\\u002F/g, '/');
      console.log(`  Found image: ${imageUrl.substring(0, 80)}...`);
      
      // Download the flyer
      const ext = imageUrl.includes('.png') ? '.png' : imageUrl.includes('.webp') ? '.webp' : '.jpg';
      const filename = `event_${event.id}${ext}`;
      const filepath = path.join(FLYER_DIR, filename);
      
      await downloadImage(imageUrl, filepath);
      
      // Update database
      const localPath = `/event-flyers/${filename}`;
      db.prepare('UPDATE events SET image_url = ? WHERE id = ?').run(localPath, event.id);
      console.log(`  ✅ Saved: ${localPath}`);
      return true;
    } else {
      console.log(`  ❌ No image found on page`);
      return false;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  let fixed = 0;
  let failed = 0;
  
  for (const event of events) {
    const success = await processEvent(event);
    if (success) fixed++;
    else failed++;
    
    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\n=== DONE ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Failed: ${failed}`);
}

main();
