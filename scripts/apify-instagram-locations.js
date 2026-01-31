import { ApifyClient } from 'apify-client';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  DB_PATH: '/opt/viberyte/lumina-web/data/lumina.db'
};

const client = new ApifyClient({ token: CONFIG.APIFY_TOKEN });
const db = new Database(CONFIG.DB_PATH);

function getPhillyVenues() {
  return db.prepare(`
    SELECT id, name, address, city
    FROM venues 
    WHERE city = 'Philadelphia' 
    AND state = 'PA'
    AND should_exclude = 0
    AND (instagram_tagged_posts IS NULL OR instagram_tagged_posts = '[]')
    LIMIT 200
  `).all();
}

async function runInstagramLocationScraper(venues) {
  console.log('\n📍 INSTAGRAM PLACE SCRAPER');
  console.log(`   Finding location posts for ${venues.length} venues\n`);
  
  // Use place search
  const searches = venues.map(v => `${v.name} Philadelphia`);
  
  console.log(`   Sample searches: ${searches.slice(0, 3).join(', ')}\n`);
  
  const input = {
    search: searches.join(','),
    searchType: 'place',
    resultsType: 'posts',
    resultsLimit: 30
  };
  
  const run = await client.actor('apify/instagram-scraper').call(input);
  
  console.log(`\n   ✅ Place scraper finished!`);
  console.log(`   📊 Run ID: ${run.id}`);
  console.log(`   💾 Downloading dataset...`);
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`   ✅ Downloaded ${items.length} location-tagged posts\n`);
  
  return items;
}

function saveLocationPosts(posts, venues) {
  console.log('\n💾 Saving Instagram location-tagged posts...');
  
  let saved = 0;
  const venueMap = new Map();
  
  for (const post of posts) {
    const locationName = (post.locationName || '').toLowerCase();
    const caption = (post.caption || '').toLowerCase();
    const combined = locationName + ' ' + caption;
    
    const venue = venues.find(v => 
      combined.includes(v.name.toLowerCase().substring(0, 10))
    );
    
    if (!venue) continue;
    
    if (!venueMap.has(venue.id)) {
      venueMap.set(venue.id, {
        posts: [],
        location_id: post.locationId
      });
    }
    
    venueMap.get(venue.id).posts.push({
      post_url: `https://www.instagram.com/p/${post.shortCode}/`,
      thumbnail_url: post.displayUrl,
      username: post.ownerUsername,
      likes: post.likesCount,
      timestamp: post.timestamp,
      caption: post.caption?.substring(0, 200)
    });
  }
  
  for (const [venueId, data] of venueMap.entries()) {
    const postsJson = JSON.stringify(data.posts.slice(0, 30));
    
    db.prepare(`
      UPDATE venues SET
        instagram_tagged_posts = ?,
        instagram_location_id = ?,
        crowd_last_updated = datetime('now')
      WHERE id = ?
    `).run(postsJson, data.location_id || null, venueId);
    
    saved++;
  }
  
  console.log(`   ✅ Saved location posts for ${saved} venues\n`);
  return saved;
}

async function main() {
  console.log('\n🎯 INSTAGRAM LOCATION INTELLIGENCE\n');
  console.log('='.repeat(60));
  
  const venues = getPhillyVenues();
  console.log(`\n📋 Loaded ${venues.length} venues needing location data\n`);
  
  try {
    const locationPosts = await runInstagramLocationScraper(venues);
    const saved = saveLocationPosts(locationPosts, venues);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ LOCATION ENRICHMENT COMPLETE!');
    console.log(`   Venues with location posts: ${saved}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(console.error);
