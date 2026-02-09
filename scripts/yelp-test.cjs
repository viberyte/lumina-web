const APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';
const ACTOR_ID = 'delicious_zebu~yelp-advanced-business-scraper-pay-per-result';

// Test with 5 venues
const testVenues = [
  "Din Tai Fung, Manhattan, NY",
  "Baires Grill, Manhattan, NY", 
  "Los Tacos No. 1, Manhattan, NY",
  "Swahili Village, Manhattan, NY",
  "Carbone, Manhattan, NY"
];

async function testYelp() {
  // Try different input formats
  const inputs = [
    // Format 1: searchTerms array
    {
      searchTerms: testVenues,
      maxItems: 10,
    },
    // Format 2: Single searches
    {
      searches: testVenues.map(v => ({ term: v.split(',')[0], location: 'New York, NY' })),
      maxItems: 10,
    },
    // Format 3: URL-based
    {
      startUrls: testVenues.map(v => ({
        url: `https://www.yelp.com/search?find_desc=${encodeURIComponent(v.split(',')[0])}&find_loc=New+York,+NY`
      })),
      maxItems: 10,
    }
  ];

  for (let i = 0; i < inputs.length; i++) {
    console.log(`\nTrying input format ${i + 1}...`);
    console.log(JSON.stringify(inputs[i], null, 2));
    
    try {
      const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs[i]),
      });

      const data = await response.json();
      
      if (data.error) {
        console.log('Error:', data.error.message);
        continue;
      }
      
      console.log('✅ Run started! ID:', data.data?.id);
      
      // Wait for it
      const runId = data.data?.id;
      if (runId) {
        console.log('Waiting for results...');
        await new Promise(r => setTimeout(r, 30000)); // 30 sec
        
        const results = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`);
        const items = await results.json();
        
        console.log(`Got ${items.length} results:`);
        items.slice(0, 3).forEach(item => {
          console.log(`  - ${item.name}: ${JSON.stringify(item.categories?.slice(0, 3))}`);
        });
        
        return; // Success!
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}

testYelp().catch(console.error);
