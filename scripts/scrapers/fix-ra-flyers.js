import https from 'https';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const FLYER_DIR = '/opt/viberyte/lumina-web/public/event-flyers';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };
    
    https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchPage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractOgImage(html) {
  // Try og:image
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogMatch) return ogMatch[1];
  
  // Try twitter:image
  const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
  if (twMatch) return twMatch[1];
  
  return null;
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    };
    
    https.get(options, (res) => {
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
    }).on('error', reject);
  });
}

async function main() {
  // Get RA events with venue photos
  const events = db.prepare(`
    SELECT id, name, ticket_url, image_url
    FROM events 
    WHERE source_type = 'resident_advisor'
    AND image_url LIKE '/venue-photos/%'
    AND ticket_url IS NOT NULL
    AND ticket_url LIKE '%ra.co%'
  `).all();
  
  console.log(`Found ${events.length} RA events needing flyers\n`);
  
  let fixed = 0;
  let failed = 0;
  const seen = new Set();
  
  for (const event of events) {
    if (seen.has(event.ticket_url)) {
      console.log(`Skipping duplicate: ${event.ticket_url}`);
      continue;
    }
    seen.add(event.ticket_url);
    
    console.log(`Processing: ${event.name} (ID: ${event.id})`);
    
    try {
      const html = await fetchPage(event.ticket_url);
      const imageUrl = extractOgImage(html);
      
      if (!imageUrl) {
        console.log(`  ❌ No og:image found`);
        failed++;
        continue;
      }
      
      // Skip RA logo/default images
      if (imageUrl.includes('ra-social') || imageUrl.includes('ra-logo') || imageUrl.includes('default')) {
        console.log(`  ⚠️ Default RA image, skipping`);
        failed++;
        continue;
      }
      
      console.log(`  Found: ${imageUrl.substring(0, 70)}...`);
      
      // Download flyer
      const ext = imageUrl.includes('.png') ? '.png' : 
                  imageUrl.includes('.webp') ? '.webp' : '.jpg';
      const filename = `event_${event.id}${ext}`;
      const filepath = path.join(FLYER_DIR, filename);
      
      await downloadImage(imageUrl, filepath);
      
      // Update DB
      const localPath = `/event-flyers/${filename}`;
      db.prepare('UPDATE events SET image_url = ? WHERE id = ?').run(localPath, event.id);
      
      console.log(`  ✅ Saved`);
      fixed++;
      
      // Rate limit - RA may block fast requests
      await new Promise(r => setTimeout(r, 500));
      
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n=== DONE ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
