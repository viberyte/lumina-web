import fetch from 'node-fetch';

const APIFY_TOKEN = 'apify_api_ScS2hZ9dHtd3snbk0LPnsbJEuv7Pdx3TkIgC';
const ACTOR_ID = 'clockworks~tiktok-scraper';

async function testApify() {
  const input = {
    searchQueries: ['#kjun'],
    resultsPerPage: 1,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false,
    addSearchQueryToResults: true
  };

  const response = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }
  );

  const run = await response.json();
  const runId = run.data.id;
  const datasetId = run.data.defaultDatasetId;
  
  console.log(`Waiting for run ${runId} to complete...`);

  let status = 'RUNNING';
  while (status === 'RUNNING' || status === 'READY') {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const statusData = await statusResponse.json();
    status = statusData.data.status;
  }

  const resultsResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  );
  
  const results = await resultsResponse.json();
  
  console.log('\n=== FULL APIFY RESPONSE (FIRST VIDEO) ===\n');
  console.log(JSON.stringify(results[0], null, 2));
  
  console.log('\n=== AVAILABLE FIELDS ===');
  console.log(Object.keys(results[0]).sort());
}

testApify();
