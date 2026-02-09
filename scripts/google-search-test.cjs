const APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';
const ACTOR_ID = 'apify~google-search-scraper';

async function testGoogleSearch() {
  // Search for venue info - queries as newline-separated string
  const input = {
    queries: "Din Tai Fung Manhattan restaurant cuisine type\nSwahili Village Newark NJ restaurant cuisine\nBaires Grill NYC restaurant cuisine type\nLos Tacos No. 1 NYC restaurant type\nCarbone NYC restaurant cuisine",
    maxPagesPerQuery: 1,
    resultsPerPage: 3,
    languageCode: "en",
    mobileResults: false,
  };

  console.log('Starting Google Search scrape...');
  
  const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await response.json();
  
  if (data.error) {
    console.log('Error:', data.error);
    return;
  }
  
  const runId = data.data?.id;
  console.log('Run ID:', runId);
  
  // Wait and poll
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 5000));
    
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`);
    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    
    process.stdout.write(status + '...');
    
    if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED') {
      console.log('');
      break;
    }
  }
  
  // Get results
  const results = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`);
  const items = await results.json();
  
  console.log(`\nGot ${items.length} search results:\n`);
  
  items.forEach(item => {
    console.log(`=== Query: ${item.searchQuery?.term || 'unknown'} ===`);
    (item.organicResults || []).slice(0, 2).forEach(r => {
      console.log(`  ${r.title}`);
      console.log(`  ${(r.description || '').substring(0, 120)}`);
      console.log('');
    });
  });
}

testGoogleSearch().catch(console.error);
