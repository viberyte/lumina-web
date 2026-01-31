import axios from 'axios';
import fs from 'fs';

const APIFY_TOKEN = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

const cities = [
  { name: 'DC', file: './dc/super_enriched_dc.json' },
  { name: 'Philly', file: './philly/super_enriched_philly.json' },
  { name: 'Baltimore', file: './baltimore/super_enriched_baltimore.json' },
  { name: 'Richmond', file: './richmond/super_enriched_richmond.json' },
  { name: 'Norfolk', file: './norfolk/super_enriched_norfolk.json' }
];

async function scrapeGoogleForSocialHandles(venueName, address) {
  const query = `${venueName} ${address} instagram OR tiktok`;
  
  try {
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
    
    const handles = {
      instagram: null,
      tiktok: null
    };
    
    results.forEach(result => {
      const text = (result.title + ' ' + result.description + ' ' + result.url).toLowerCase();
      
      // Extract Instagram handle
      const igMatch = text.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (igMatch && !handles.instagram) {
        handles.instagram = igMatch[1];
      }
      
      // Extract TikTok handle  
      const ttMatch = text.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
      if (ttMatch && !handles.tiktok) {
        handles.tiktok = ttMatch[1];
      }
    });
    
    return handles;
    
  } catch (err) {
    return { instagram: null, tiktok: null, error: err.message };
  }
}

async function enrichCityWithSocialHandles(cityName, cityFile) {
  console.log(`\n📱 PROCESSING ${cityName.toUpperCase()}`);
  
  const venues = JSON.parse(fs.readFileSync(cityFile, 'utf8'));
  const outputFile = cityFile.replace('.json', '_with_social.json');
  
  // Load existing progress if any
  let enriched = [];
  if (fs.existsSync(outputFile)) {
    enriched = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    console.log(`   Resuming from ${enriched.length} venues`);
  }
  
  const enrichedNames = new Set(enriched.map(v => v.venueName));
  const remaining = venues.filter(v => !enrichedNames.has(v.venueName));
  
  console.log(`   Total: ${venues.length}`);
  console.log(`   Already done: ${enriched.length}`);
  console.log(`   Remaining: ${remaining.length}`);
  
  for (let i = 0; i < remaining.length; i++) {
    const venue = remaining[i];
    console.log(`\n[${enriched.length + 1}/${venues.length}] ${venue.venueName}`);
    
    const handles = await scrapeGoogleForSocialHandles(venue.venueName, venue.address);
    
    if (handles.instagram || handles.tiktok) {
      console.log(`   ✅ IG: ${handles.instagram || 'none'} | TT: ${handles.tiktok || 'none'}`);
    } else {
      console.log(`   ⚠️  No handles found`);
    }
    
    enriched.push({
      ...venue,
      instagram_handle: handles.instagram,
      tiktok_handle: handles.tiktok
    });
    
    // Save every 10 venues
    if (enriched.length % 10 === 0) {
      fs.writeFileSync(outputFile, JSON.stringify(enriched, null, 2));
      console.log(`   💾 Progress saved (${enriched.length}/${venues.length})`);
    }
    
    // Rate limit: 3 seconds between requests
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Final save
  fs.writeFileSync(outputFile, JSON.stringify(enriched, null, 2));
  
  const withIG = enriched.filter(v => v.instagram_handle).length;
  const withTT = enriched.filter(v => v.tiktok_handle).length;
  const withEither = enriched.filter(v => v.instagram_handle || v.tiktok_handle).length;
  
  console.log(`\n✅ ${cityName.toUpperCase()} COMPLETE!`);
  console.log(`   Instagram: ${withIG}/${enriched.length} (${Math.round(withIG/enriched.length*100)}%)`);
  console.log(`   TikTok: ${withTT}/${enriched.length} (${Math.round(withTT/enriched.length*100)}%)`);
  console.log(`   Either: ${withEither}/${enriched.length} (${Math.round(withEither/enriched.length*100)}%)`);
}

async function processAllCities() {
  console.log(`🚀 SOCIAL HANDLE SCRAPER - ALL CITIES`);
  console.log(`   Total venues: 1,726`);
  console.log(`   Cities: 5`);
  console.log(`\nStarting...\n`);
  
  for (const city of cities) {
    await enrichCityWithSocialHandles(city.name, city.file);
  }
  
  console.log(`\n🎉🎉🎉 ALL CITIES COMPLETE! 🎉🎉🎉`);
}

processAllCities().catch(console.error);
