const fs = require('fs');
const axios = require('axios');

const APIFY_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

// Load venues missing IG handles
const venues = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/data/venues_with_ig.json', 'utf8'));
const missing = venues.filter(v => !v.instagram_handle);

console.log(`APIFY INSTAGRAM SEARCH\n`);
console.log(`Total venues: ${venues.length}`);
console.log(`Already have IG: ${venues.length - missing.length}`);
console.log(`Missing IG: ${missing.length}\n`);

async function searchInstagram(venue) {
  const searchQuery = `${venue.name} ${venue.city}`;
  
  try {
    // Use Apify's Instagram Search actor
    const runUrl = 'https://api.apify.com/v2/acts/apify~instagram-search/run-sync-get-dataset-items';
    
    const res = await axios.post(runUrl, {
      search: searchQuery,
      resultsLimit: 3,
      searchType: 'user',
    }, {
      headers: { 'Authorization': `Bearer ${APIFY_KEY}` },
      params: { token: APIFY_KEY },
      timeout: 30000,
    });
    
    const results = res.data;
    
    if (results && results.length > 0) {
      // Return first matching username
      const user = results[0];
      return user.username || user.ownerUsername || null;
    }
    return null;
  } catch (e) {
    if (e.response?.status === 402) {
      console.log('\n⚠️  APIFY CREDITS EXHAUSTED');
      process.exit(1);
    }
    return null;
  }
}

async function run() {
  let found = 0, notFound = 0;
  
  for (let i = 0; i < missing.length; i++) {
    const v = missing[i];
    const label = `[${i+1}/${missing.length}] ${v.name.slice(0,38).padEnd(38)}`;
    
    process.stdout.write(`${label} `);
    
    const handle = await searchInstagram(v);
    
    if (handle) {
      v.instagram_handle = handle;
      found++;
      console.log(`✅ @${handle}`);
    } else {
      notFound++;
      console.log(`❌`);
    }
    
    // Save progress every 50 venues
    if ((i + 1) % 50 === 0) {
      fs.writeFileSync('/opt/viberyte/lumina-web/data/venues_with_ig.json', JSON.stringify(venues, null, 2));
      console.log(`  💾 Saved progress...`);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Final save
  fs.writeFileSync('/opt/viberyte/lumina-web/data/venues_with_ig.json', JSON.stringify(venues, null, 2));
  
  const totalWithIG = venues.filter(v => v.instagram_handle).length;
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  APIFY IG SEARCH COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Found: ${found}`);
  console.log(`❌ Not found: ${notFound}`);
  console.log(`📊 Total with IG: ${totalWithIG}/${venues.length} (${Math.round(totalWithIG/venues.length*100)}%)`);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
