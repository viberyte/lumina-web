import Database from 'better-sqlite3';
import https from 'https';
import fs from 'fs';
import path from 'path';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const FLYERS_DIR = '/opt/viberyte/lumina-web/public/event-flyers';
const APIFY_URL = 'https://api.apify.com/v2/datasets/DnglL4nxgKYQbHfKI/items?token=apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    const file = fs.createWriteStream(filepath);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (res2) => {
          res2.pipe(file);
          file.on('finish', () => { file.close(); resolve(true); });
        }).on('error', reject);
      } else {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(true); });
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('🎯 Fetching Apify POSH dataset...');
  const poshEvents = await fetchJSON(APIFY_URL);
  console.log(`📦 Found ${poshEvents.length} POSH events in dataset\n`);

  // Build lookup map: event title (normalized) -> cover URL
  const poshFlyers = {};
  for (const event of poshEvents) {
    if (event.coverUrl && event.eventTitle) {
      // Normalize title for matching
      const normalizedTitle = event.eventTitle.toLowerCase().trim();
      poshFlyers[normalizedTitle] = event.coverUrl;
      // Also store by eventUrl for backup matching
      if (event.eventUrl) {
        poshFlyers[event.eventUrl] = event.coverUrl;
      }
    }
  }
  console.log(`🖼️  ${Object.keys(poshFlyers).length} POSH events have cover images\n`);

  // Find POSH events in DB that need flyers
  const needsFlyer = db.prepare(`
    SELECT id, name, ticket_url, image_url 
    FROM events 
    WHERE source_type = 'posh'
      AND (
        image_url LIKE '%unsplash%' 
        OR image_url LIKE '%googleapis%'
        OR image_url LIKE '%googleusercontent%'
        OR image_url IS NULL 
        OR image_url = ''
      )
  `).all();

  console.log(`🔍 Found ${needsFlyer.length} POSH events needing flyers\n`);

  const updateStmt = db.prepare('UPDATE events SET image_url = ? WHERE id = ?');
  
  let fixed = 0;
  let notFound = 0;
  let downloadFailed = 0;

  for (const event of needsFlyer) {
    // Try to match by normalized title
    const normalizedName = event.name.toLowerCase().trim();
    let flyerUrl = poshFlyers[normalizedName];
    
    // Try matching by ticket_url if title didn't match
    if (!flyerUrl && event.ticket_url) {
      flyerUrl = poshFlyers[event.ticket_url];
    }
    
    // Try partial matching
    if (!flyerUrl) {
      for (const [key, url] of Object.entries(poshFlyers)) {
        if (key.includes(normalizedName.substring(0, 20)) || normalizedName.includes(key.substring(0, 20))) {
          flyerUrl = url;
          break;
        }
      }
    }
    
    if (!flyerUrl) {
      console.log(`❓ No match: ${event.name.substring(0, 40)}...`);
      notFound++;
      continue;
    }

    const ext = flyerUrl.includes('.png') ? '.png' : flyerUrl.includes('.webp') ? '.webp' : '.jpg';
    const filename = `event_${event.id}${ext}`;
    const filepath = path.join(FLYERS_DIR, filename);
    const localPath = `/event-flyers/${filename}`;

    try {
      await downloadImage(flyerUrl, filepath);
      updateStmt.run(localPath, event.id);
      fixed++;
      console.log(`✅ ${event.name.substring(0, 40)}... -> ${filename}`);
    } catch (err) {
      downloadFailed++;
      console.log(`❌ Failed: ${event.name.substring(0, 40)}... - ${err.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`❓ No match in POSH data: ${notFound}`);
  console.log(`❌ Download failed: ${downloadFailed}`);
  console.log(`========================================`);
}

main().catch(console.error);
