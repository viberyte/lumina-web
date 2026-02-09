const APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';
const ACTOR_ID = 'delicious_zebu~yelp-advanced-business-scraper-pay-per-result';

async function testYelp() {
  // Use direct Yelp search URLs
  const input = {
    startUrls: [
      { url: "https://www.yelp.com/search?find_desc=Din+Tai+Fung&find_loc=New+York%2C+NY" },
      { url: "https://www.yelp.com/search?find_desc=Carbone&find_loc=New+York%2C+NY" },
      { url: "https://www.yelp.com/search?find_desc=Los+Tacos&find_loc=New+York%2C+NY" },
    ],
    maxItems: 10,
  };

  console.log('Starting Yelp scrape with URLs...');
  
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
  
  // Wait longer and poll
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 10000)); // 10 sec
    
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`);
    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    
    console.log(`Status: ${status}`);
    
    if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ABORTED') {
      break;
    }
  }
  
  // Get results
  const results = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`);
  const items = await results.json();
  
  console.log(`\nGot ${items.length} results:`);
  items.forEach(item => {
    console.log(`  - ${item.name || item.title}: ${JSON.stringify(item.categories || item.category)}`);
  });
}

testYelp().catch(console.error);
