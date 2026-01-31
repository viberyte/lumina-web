import https from 'https';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const FLYER_DIR = '/opt/viberyte/lumina-web/public/event-flyers';

const APIFY_URL = 'https://api.apify.com/v2/datasets/ZM1X2rRdLBTFQelUT/items?token=apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

function fetchDataset() {
  return new Promise((resolve, reject) => {
    https.get(APIFY_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseMarkdownForEvents(item) {
  const events = [];
  const markdown = item.markdown || '';
  const sourceUrl = item.url || '';
  
  // Pattern: ![Event Name](image_url) followed by date/time and event name
  // Example: ![Sam Allan](https://cdn.prod...) \n January 30, 2026 11:00 PM \n Sam Allan
  
  // Regex to find image + text blocks
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const lines = markdown.split('\n');
  
  let match;
  while ((match = imagePattern.exec(markdown)) !== null) {
    const altText = match[1].trim();
    const imageUrl = match[2].trim();
    
    // Skip generic/header images
    if (!altText || 
        altText.toLowerCase().includes('logo') ||
        altText.toLowerCase().includes('header') ||
        imageUrl.includes('og-default') ||
        imageUrl.includes('favicon') ||
        imageUrl.length < 50) {
      continue;
    }
    
    // Skip tiny thumbnails (88x88 etc)
    if (imageUrl.includes('88x88') || imageUrl.includes('scale_crop/88')) {
      continue;
    }
    
    // Extract event info
    events.push({
      name: altText,
      imageUrl: imageUrl,
      sourceUrl: sourceUrl,
      source: detectSource(sourceUrl)
    });
  }
  
  return events;
}

function detectSource(url) {
  if (url.includes('shotgun.live')) return 'shotgun';
  if (url.includes('dice.fm')) return 'dice';
  if (url.includes('nebula')) return 'venue-calendar';
  if (url.includes('universe.com')) return 'universe';
  if (url.includes('posh.vip')) return 'posh';
  if (url.includes('ra.co')) return 'resident_advisor';
  return 'apify-crawl';
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

async function main() {
  console.log('Fetching Apify dataset...');
  const dataset = await fetchDataset();
  console.log(`Got ${dataset.length} pages`);
  
  // Parse all events from markdown
  let allEvents = [];
  for (const item of dataset) {
    const events = parseMarkdownForEvents(item);
    allEvents = allEvents.concat(events);
  }
  
  console.log(`\nParsed ${allEvents.length} events with images`);
  
  // Check which events exist in DB but have venue photos (not flyers)
  const venuePhotoEvents = db.prepare(`
    SELECT id, name, source_type, image_url 
    FROM events 
    WHERE image_url LIKE '/venue-photos/%'
  `).all();
  
  console.log(`\nDB has ${venuePhotoEvents.length} events with venue photos (need flyers)`);
  
  // Try to match and fix
  let fixed = 0;
  let notFound = 0;
  
  for (const dbEvent of venuePhotoEvents) {
    // Find matching event in parsed data
    const normalizedDbName = dbEvent.name.toLowerCase().trim();
    
    const match = allEvents.find(e => {
      const normalizedParsedName = e.name.toLowerCase().trim();
      return normalizedParsedName === normalizedDbName ||
             normalizedDbName.includes(normalizedParsedName) ||
             normalizedParsedName.includes(normalizedDbName);
    });
    
    if (match) {
      try {
        // Download flyer
        const ext = match.imageUrl.includes('.png') ? '.png' : 
                    match.imageUrl.includes('.webp') ? '.webp' : '.jpg';
        const filename = `event_${dbEvent.id}${ext}`;
        const filepath = path.join(FLYER_DIR, filename);
        
        console.log(`Fixing: ${dbEvent.name}`);
        await downloadImage(match.imageUrl, filepath);
        
        // Update DB
        const localPath = `/event-flyers/${filename}`;
        db.prepare('UPDATE events SET image_url = ? WHERE id = ?').run(localPath, dbEvent.id);
        fixed++;
        
        // Rate limit
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.log(`  ❌ Download failed: ${err.message}`);
      }
    } else {
      notFound++;
    }
  }
  
  console.log(`\n=== DONE ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Not found in dataset: ${notFound}`);
}

main().catch(console.error);
