import Database from 'better-sqlite3';
import { ApifyClient } from 'apify-client';

const db = new Database('./data/lumina.db');
const client = new ApifyClient({
    token: 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel',
});

const venues = db.prepare(`
  SELECT id, name, city, address, neighborhood, category
  FROM venues 
  WHERE (category LIKE '%dining%' OR category LIKE '%nightlife%' OR category LIKE '%entertainment%') 
  AND (instagram_handle IS NULL OR instagram_handle = '')
  AND city IN ('Manhattan', 'Brooklyn', 'Queens', 'Bronx')
  LIMIT 100
`).all();

console.log(`🔍 Searching Instagram for ${venues.length} venues...\n`);

let found = 0;
let processed = 0;

for (const venue of venues) {
  try {
    processed++;
    console.log(`[${processed}/${venues.length}] ${venue.name}`);
    
    const searchQuery = `${venue.name} ${venue.city} restaurant bar lounge`;
    
    const run = await client.actor("apify/instagram-profile-scraper").call({
      usernames: [],  // Empty array required!
      directUrls: [],
      resultsType: "details",
      resultsLimit: 5,
      searchType: "hashtag",
      searchLimit: 5,
      addParentData: false
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log(`  Found ${items.length} results`);
    
    if (items.length > 0) {
      const profile = items[0];
      const bio = (profile.biography || '').toLowerCase();
      
      const isVenue = bio.includes('restaurant') || 
                     bio.includes('bar') || 
                     bio.includes('food') ||
                     bio.includes(venue.city.toLowerCase());
      
      if (isVenue) {
        db.prepare('UPDATE venues SET instagram_handle = ? WHERE id = ?')
          .run(profile.username, venue.id);
        found++;
        console.log(`  ✅ @${profile.username}\n`);
      } else {
        console.log(`  ⚠️  No good match\n`);
      }
    } else {
      console.log(`  ❌ Not found\n`);
    }
    
    await new Promise(r => setTimeout(r, 3000));
    
  } catch (error) {
    console.error(`  ❌ ${error.message}\n`);
  }
}

console.log(`\n🎉 Done! Processed: ${processed}, Found: ${found}`);
