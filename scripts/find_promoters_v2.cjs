const fs = require('fs');
const axios = require('axios');

const APIFY_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

const SEARCH_QUERIES = [
  'site:instagram.com "nyc promoter" bio',
  'site:instagram.com "nyc nightlife" promoter',
  'site:instagram.com "bottle service" nyc',
  'site:instagram.com "table service" nyc',
  'site:instagram.com "vip host" nyc',
  'site:instagram.com "guestlist" nyc promoter',
  'site:instagram.com "club promoter" new york',
  'site:instagram.com "nj promoter"',
  'site:instagram.com "newark nightlife"',
  'site:instagram.com "sections available" nyc',
  'site:instagram.com "dm for tables" nyc',
  'site:instagram.com "book tables" nyc nightlife',
];

async function searchGoogle(query) {
  try {
    const res = await axios.post(
      'https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=' + APIFY_KEY,
      {
        queries: query,
        maxPagesPerQuery: 2,
        resultsPerPage: 20,
      },
      { timeout: 120000 }
    );
    
    // Get the run ID and wait for results
    const runId = res.data?.data?.id;
    if (!runId) return [];
    
    // Wait for completion
    await new Promise(r => setTimeout(r, 15000));
    
    // Fetch results
    const dataRes = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_KEY}`,
      { timeout: 30000 }
    );
    
    return dataRes.data || [];
  } catch (e) {
    console.log(`  ⚠️ Error: ${e.message}`);
    return [];
  }
}

function extractUsername(url) {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
  if (match) {
    const handle = match[1].toLowerCase();
    const skip = ['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct'];
    if (!skip.includes(handle)) return handle;
  }
  return null;
}

async function run() {
  console.log('PROMOTER FINDER v2 (via Google)\n');
  
  const allPromoters = new Map();
  
  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const query = SEARCH_QUERIES[i];
    console.log(`[${i+1}/${SEARCH_QUERIES.length}] "${query.slice(0,50)}..."`);
    
    const results = await searchGoogle(query);
    
    for (const result of results) {
      if (!result.organicResults) continue;
      
      for (const item of result.organicResults) {
        const url = item.url || item.link || '';
        const username = extractUsername(url);
        if (!username || allPromoters.has(username)) continue;
        
        const title = item.title || '';
        const snippet = item.description || item.snippet || '';
        
        allPromoters.set(username, {
          username,
          title,
          snippet,
          url: `https://instagram.com/${username}`,
          source_query: query,
        });
        
        console.log(`  ✅ @${username}`);
      }
    }
    
    console.log(`  → ${allPromoters.size} total promoters\n`);
    await new Promise(r => setTimeout(r, 5000));
  }
  
  const promoters = Array.from(allPromoters.values());
  fs.writeFileSync('/opt/viberyte/lumina-web/data/promoters.json', JSON.stringify(promoters, null, 2));
  
  console.log(`${'='.repeat(50)}`);
  console.log(`  PROMOTER SEARCH COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total promoters found: ${promoters.length}`);
  console.log(`Saved: data/promoters.json`);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
