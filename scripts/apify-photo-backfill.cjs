const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const APIFY_TOKEN = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';
const PHOTO_DIR = '/mnt/HC_Volume_104366905/venue-photos';
const PUBLIC_PHOTO_DIR = '/opt/viberyte/lumina-web/public/venue-photos';

// Get all nightlife venues needing photos with Instagram handles
const venues = db.prepare(`
  SELECT id, name, instagram_handle, city
  FROM venues
  WHERE should_exclude = 0
    AND category IN ('nightclub','lounge','bar','rooftop','live_music')
    AND (google_photos IS NULL OR google_photos = '' OR google_photos = '[]')
    AND (gallery_photos IS NULL OR gallery_photos = '' OR gallery_photos = '[]')
    AND instagram_handle IS NOT NULL AND instagram_handle != ''
  ORDER BY city, name
`).all();

console.log(`[photo-backfill] Found ${venues.length} venues to scrape Instagram photos`);

const updateGallery = db.prepare('UPDATE venues SET gallery_photos = ? WHERE id = ?');
const updateHero = db.prepare('UPDATE venues SET image_url = ? WHERE id = ?');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    client.get(url, { 
      timeout: 30000,
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
        if (stats.size < 1000) {
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

async function scrapeInstagramProfile(handle) {
  // Use Apify Instagram Profile Scraper
  const cleanHandle = handle.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '').trim();
  
  const runUrl = `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${APIFY_TOKEN}`;
  
  const body = JSON.stringify({
    usernames: [cleanHandle],
    resultsLimit: 12,
    addParentData: false,
  });

  const response = await fetch(runUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Apify run failed: HTTP ${response.status}`);
  }

  const runData = await response.json();
  const runId = runData.data?.id;
  
  if (!runId) throw new Error('No run ID returned');

  // Poll for completion
  let attempts = 0;
  while (attempts < 60) {
    await sleep(3000);
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    
    if (status === 'SUCCEEDED') break;
    if (status === 'FAILED' || status === 'ABORTED') throw new Error(`Run ${status}`);
    attempts++;
  }

  // Get results
  const datasetRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`);
  const items = await datasetRes.json();
  
  // Extract image URLs from posts
  const imageUrls = [];
  for (const item of items) {
    if (item.displayUrl) imageUrls.push(item.displayUrl);
    if (item.images && Array.isArray(item.images)) {
      item.images.forEach(img => { if (img) imageUrls.push(img); });
    }
    // Also check latestPosts for profile scraper
    if (item.latestPosts && Array.isArray(item.latestPosts)) {
      item.latestPosts.forEach(post => {
        if (post.displayUrl) imageUrls.push(post.displayUrl);
        if (post.images) post.images.forEach(img => { if (img) imageUrls.push(img); });
      });
    }
  }

  return [...new Set(imageUrls)].slice(0, 10);
}

async function processVenue(venue, index) {
  const handle = venue.instagram_handle.replace('@', '').trim();
  if (!handle) return false;

  try {
    console.log(`[${index + 1}/${venues.length}] ${venue.name} (@${handle}) - ${venue.city}`);
    
    const imageUrls = await scrapeInstagramProfile(handle);
    
    if (imageUrls.length === 0) {
      console.log(`  ⚠️  No images found`);
      return false;
    }

    // Download photos locally
    const localPaths = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const filename = `venue_${venue.id}_${i + 1}.jpg`;
      const hcPath = path.join(PHOTO_DIR, filename);
      const publicPath = path.join(PUBLIC_PHOTO_DIR, filename);
      
      try {
        await downloadFile(imageUrls[i], hcPath);
        // Copy to public dir
        fs.copyFileSync(hcPath, publicPath);
        localPaths.push(`/venue-photos/${filename}`);
      } catch (dlErr) {
        console.log(`  ⚠️  Failed to download photo ${i + 1}: ${dlErr.message}`);
      }
    }

    if (localPaths.length === 0) {
      console.log(`  ⚠️  All downloads failed`);
      return false;
    }

    // Update DB
    updateGallery.run(JSON.stringify(localPaths), venue.id);
    
    // Update hero if current one is just an Instagram CDN url or a single scraped photo
    const currentHero = db.prepare('SELECT image_url FROM venues WHERE id = ?').get(venue.id);
    if (currentHero?.image_url?.includes('instagram') || currentHero?.image_url?.includes('venue-photos/venue_')) {
      updateHero.run(localPaths[0], venue.id);
    }

    console.log(`  ✅ ${localPaths.length} photos saved`);
    return true;

  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    return false;
  }
}

async function main() {
  // Ensure directories exist
  if (!fs.existsSync(PHOTO_DIR)) fs.mkdirSync(PHOTO_DIR, { recursive: true });
  if (!fs.existsSync(PUBLIC_PHOTO_DIR)) fs.mkdirSync(PUBLIC_PHOTO_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  for (let i = 0; i < venues.length; i++) {
    const result = await processVenue(venues[i], i);
    if (result) success++;
    else failed++;

    // Progress update every 10
    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${venues.length} | ✅ ${success} | ❌ ${failed} ---\n`);
    }

    // Rate limit between venues
    await sleep(2000);
  }

  console.log(`\n========================================`);
  console.log(`Done! ✅ ${success} | ❌ ${failed} | Total: ${venues.length}`);
  console.log(`========================================`);

  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  db.close();
  process.exit(1);
});
