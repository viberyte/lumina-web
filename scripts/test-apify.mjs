const APIFY_TOKEN = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

// Test direct API call
const response = await fetch('https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${APIFY_TOKEN}`
  },
  body: JSON.stringify({
    search: 'din tai fung nyc',
    resultsLimit: 3
  })
});

const run = await response.json();
console.log('Run started:', run);

// Wait a bit
await new Promise(r => setTimeout(r, 10000));

// Get results
const resultsRes = await fetch(`https://api.apify.com/v2/actor-runs/${run.data.id}/dataset/items`, {
  headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` }
});

const results = await resultsRes.json();
console.log('Results:', JSON.stringify(results, null, 2));
