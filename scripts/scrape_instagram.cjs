const fs = require('fs');
const axios = require('axios');

const classified = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/data/ai_classified_v3.json', 'utf8'));

console.log(`INSTAGRAM HANDLE SCRAPER v2\n`);
console.log(`Venues to process: ${classified.length}\n`);

// Only match full instagram.com URLs, not @mentions or share buttons
const IG_PATTERN = /(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]){3,30}(?:\/|\?|$)/gi;

// Junk handles to ignore
const JUNK_HANDLES = [
  'media', 'share', 'p', 'reel', 'reels', 'explore', 'stories', 'direct',
  'accounts', 'login', 'signup', 'about', 'help', 'privacy', 'terms',
  'etsy', 'facebook', 'twitter', 'tiktok', 'youtube', 'linkedin', 'pinterest',
  'yelp', 'tripadvisor', 'opentable', 'resy', 'doordash', 'ubereats', 'grubhub',
  'google', 'apple', 'android', 'app', 'download', 'intent', 'sharer',
];

async function scrapeInstagram(venue) {
  if (!venue.website) return null;
  
  try {
    const res = await axios.get(venue.website, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      maxRedirects: 3,
    });
    
    const html = res.data;
    const matches = html.matchAll(IG_PATTERN);
    
    for (const match of matches) {
      // Extract handle from the URL
      const fullMatch = match[0];
      const handleMatch = fullMatch.match(/(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/i);
      if (!handleMatch) continue;
      
      const handle = handleMatch[1].toLowerCase();
      
      // Skip junk
      if (JUNK_HANDLES.includes(handle)) continue;
      if (handle.length < 3 || handle.length > 30) continue;
      if (/^[0-9]+$/.test(handle)) continue; // Skip pure numbers
      
      return handle;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function run() {
  let found = 0, notFound = 0, noWebsite = 0;
  
  for (let i = 0; i < classified.length; i++) {
    const v = classified[i];
    const label = `[${i+1}/${classified.length}] ${v.name.slice(0,40).padEnd(40)}`;
    
    if (!v.website) {
      noWebsite++;
      console.log(`${label} ⚪ no website`);
      continue;
    }
    
    process.stdout.write(`${label} `);
    const handle = await scrapeInstagram(v);
    
    if (handle) {
      v.instagram_handle = handle;
      found++;
      console.log(`✅ @${handle}`);
    } else {
      notFound++;
      console.log(`❌ not found`);
    }
    
    if ((i + 1) % 10 === 0) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  fs.writeFileSync('/opt/viberyte/lumina-web/data/venues_with_ig.json', JSON.stringify(classified, null, 2));
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  INSTAGRAM SCRAPE COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Found: ${found}`);
  console.log(`❌ Not found: ${notFound}`);
  console.log(`⚪ No website: ${noWebsite}`);
  console.log(`\nSaved: data/venues_with_ig.json`);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
