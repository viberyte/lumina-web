const fs = require('fs');
const axios = require('axios');

const APIFY_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

// Search terms that find promoters
const SEARCHES = [
  'nyc promoter',
  'nyc nightlife promoter', 
  'nyc club promoter',
  'brooklyn promoter',
  'nyc bottle service',
  'nyc table service',
  'nyc vip host',
  'nyc guestlist',
  'nj promoter',
  'nyc sections',
  'nyc bookings nightlife',
];

async function searchGoogle(query) {
  console.log(`  Searching: "${query}"`);
  
  try {
    const res = await axios.post(
      `https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=${APIFY_KEY}`,
      {
        queries: `site:instagram.com "${query}"`,
        maxPagesPerQuery: 2,
        resultsPerPage: 20,
      },
      { timeout: 120000 }
    );
    
    const runId = res.data?.data?.id;
    if (!runId) return [];
    
    // Wait for completion
    console.log(`    Waiting for results...`);
    await new Promise(r => setTimeout(r, 20000));
    
    const dataRes = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_KEY}`,
      { timeout: 30000 }
    );
    
    return dataRes.data || [];
  } catch (e) {
    console.log(`    Error: ${e.message}`);
    return [];
  }
}

function extractUsername(url) {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
  if (match) {
    const handle = match[1].toLowerCase();
    const skip = ['p', 'reel', 'reels', 'stories', 'explore', 'accounts'];
    if (!skip.includes(handle) && handle.length > 2) return handle;
  }
  return null;
}

async function run() {
  console.log('APIFY PROMOTER SEARCH\n');
  
  const allPromoters = new Map();
  
  for (const query of SEARCHES) {
    const results = await searchGoogle(query);
    
    for (const result of results) {
      const organicResults = result.organicResults || [];
      
      for (const item of organicResults) {
        const url = item.url || item.link || '';
        const username = extractUsername(url);
        
        if (username && !allPromoters.has(username)) {
          allPromoters.set(username, {
            username,
            title: item.title || '',
            description: item.description || '',
            url: `https://instagram.com/${username}`,
            source_query: query,
          });
          console.log(`    ✅ @${username}`);
        }
      }
    }
    
    console.log(`  Total so far: ${allPromoters.size}\n`);
    await new Promise(r => setTimeout(r, 3000));
  }
  
  const promoters = Array.from(allPromoters.values());
  fs.writeFileSync('data/promoters_apify.json', JSON.stringify(promoters, null, 2));
  
  console.log(`${'='.repeat(50)}`);
  console.log(`  PROMOTER SEARCH COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total unique promoters: ${promoters.length}`);
  console.log(`Saved: data/promoters_apify.json`);
}

run().catch(e => console.error('FATAL:', e.message));
