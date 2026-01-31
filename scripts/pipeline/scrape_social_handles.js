import axios from 'axios';
import fs from 'fs';

const APIFY_TOKEN = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

async function scrapeGoogleForSocialHandles(venueName, city) {
  console.log(`\n🔍 Searching: ${venueName} (${city})`);
  
  try {
    // Use Google Search API via Apify
    const query = `${venueName} ${city} instagram OR tiktok`;
    
    const response = await axios.post(
      `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        queries: [query],
        maxPagesPerQuery: 1,
        resultsPerPage: 10
      },
      { timeout: 60000 }
    );
    
    const results = response.data || [];
    
    // Extract Instagram/TikTok handles from results
    const handles = {
      instagram: null,
      tiktok: null
    };
    
    results.forEach(result => {
      const text = (result.title + ' ' + result.description + ' ' + result.url).toLowerCase();
      
      // Extract Instagram handle
      const igMatch = text.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (igMatch && !handles.instagram) {
        handles.instagram = '@' + igMatch[1];
      }
      
      // Extract TikTok handle  
      const ttMatch = text.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
      if (ttMatch && !handles.tiktok) {
        handles.tiktok = '@' + ttMatch[1];
      }
    });
    
    if (handles.instagram || handles.tiktok) {
      console.log(`   ✅ Instagram: ${handles.instagram || 'none'}`);
      console.log(`   ✅ TikTok: ${handles.tiktok || 'none'}`);
    } else {
      console.log(`   ⚠️  No social handles found`);
    }
    
    return handles;
    
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return { instagram: null, tiktok: null };
  }
}

async function batchScrapeSocialHandles() {
  const venues = JSON.parse(fs.readFileSync('all_nightlife_websites_complete.json', 'utf8'));
  
  console.log(`📱 SOCIAL HANDLE SCRAPER`);
  console.log(`   Total venues: ${venues.length}`);
  console.log(`   Starting with first 50...`);
  
  const results = [];
  
  for (let i = 0; i < Math.min(50, venues.length); i++) {
    const venue = venues[i];
    const handles = await scrapeGoogleForSocialHandles(venue.venueName, venue.city);
    
    results.push({
      ...venue,
      instagram_handle: handles.instagram,
      tiktok_handle: handles.tiktok
    });
    
    // Save progress every 10
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync('social_handles_results.json', JSON.stringify(results, null, 2));
      console.log(`\n💾 Progress saved: ${i + 1}/50\n`);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 3000));
  }
  
  fs.writeFileSync('social_handles_results.json', JSON.stringify(results, null, 2));
  
  const withIG = results.filter(r => r.instagram_handle).length;
  const withTT = results.filter(r => r.tiktok_handle).length;
  
  console.log(`\n📊 COMPLETE:`);
  console.log(`   Instagram handles found: ${withIG}/50`);
  console.log(`   TikTok handles found: ${withTT}/50`);
}

batchScrapeSocialHandles().catch(console.error);
