const fs = require('fs');
const axios = require('axios');

const GOOGLE_API_KEY = 'AIzaSyAqluEυυυυυυυυοοοοοοοοοοοοοο'; // We need your Google API key

// Load venues that are missing IG handles
const venues = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/data/venues_with_ig.json', 'utf8'));
const missing = venues.filter(v => !v.instagram_handle);

console.log(`GOOGLE INSTAGRAM SEARCH\n`);
console.log(`Missing IG handles: ${missing.length}\n`);

const JUNK = ['media','share','p','reel','reels','explore','stories','accounts','login','yelp','tripadvisor','opentable','facebook','twitter'];

async function searchGoogle(venue) {
  const query = encodeURIComponent(`${venue.name} ${venue.city} instagram`);
  
  try {
    // Use Google Custom Search API or scrape Google directly
    const res = await axios.get(`https://www.google.com/search?q=${query}`, {
      timeout: 8000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });
    
    const html = res.data;
    
    // Find instagram.com links in results
    const matches = html.matchAll(/instagram\.com\/([a-zA-Z0-9_.]{3,30})/gi);
    
    for (const match of matches) {
      const handle = match[1].toLowerCase();
      if (JUNK.includes(handle)) continue;
      if (/^[0-9]+$/.test(handle)) continue;
      return handle;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function run() {
  let found = 0;
  
  for (let i = 0; i < missing.length; i++) {
    const v = missing[i];
    const label = `[${i+1}/${missing.length}] ${v.name.slice(0,40).padEnd(40)}`;
    
    process.stdout.write(`${label} `);
    const handle = await searchGoogle(v);
    
    if (handle) {
      v.instagram_handle = handle;
      found++;
      console.log(`✅ @${handle}`);
    } else {
      console.log(`❌`);
    }
    
    // Rate limit - Google blocks fast requests
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Save back to full list
  fs.writeFileSync('/opt/viberyte/lumina-web/data/venues_with_ig.json', JSON.stringify(venues, null, 2));
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  GOOGLE IG SEARCH COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Found: ${found} more handles`);
  console.log(`Total with IG: ${venues.filter(v => v.instagram_handle).length}/${venues.length}`);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
