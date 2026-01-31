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

function getVenuesNeedingPosts() {
  return db.prepare(`
    SELECT id, name, instagram_handle
    FROM venues 
    WHERE city = 'Philadelphia' 
    AND state = 'PA'
    AND instagram_handle IS NOT NULL
    AND instagram_handle != ''
    AND (instagram_tagged_posts IS NULL OR instagram_tagged_posts = '[]')
  `).all();
}

async function runInstagramPostScraper(venues) {
  console.log('\n📸 INSTAGRAM POST SCRAPER');
  console.log(`   Scraping posts from ${venues.length} venue feeds\n`);
  
  const usernames = venues.map(v => v.instagram_handle);
  
  console.log(`   Sample handles: ${usernames.slice(0, 5).join(', ')}\n`);
  
  const input = {
    username: usernames,
    resultsLimit: 20
  };
  
  const run = await client.actor('apify/instagram-post-scraper').call(input);
  
  console.log(`\n   ✅ Post scraper finished!`);
  console.log(`   📊 Run ID: ${run.id}`);
  console.log(`   💾 Downloading dataset...`);
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`   ✅ Downloaded ${items.length} posts\n`);
  
  return items;
}

function saveFeedPosts(posts, venues) {
  console.log('\n💾 Saving Instagram feed posts...');
  
  let saved = 0;
  const venueMap = new Map();
  
  for (const post of posts) {
    const ownerUsername = (post.ownerUsername || '').toLowerCase();
    
    const venue = venues.find(v => 
      v.instagram_handle.toLowerCase() === ownerUsername
    );
    
    if (!venue) continue;
    
    if (!venueMap.has(venue.id)) {
      venueMap.set(venue.id, []);
    }
    
    venueMap.get(venue.id).push({
      post_url: `https://www.instagram.com/p/${post.shortCode}/`,
      thumbnail_url: post.displayUrl,
      username: post.ownerUsername,
      likes: post.likesCount,
      comments: post.commentsCount,
      timestamp: post.timestamp,
      caption: post.caption?.substring(0, 200)
    });
  }
  
  for (const [venueId, venuePosts] of venueMap.entries()) {
    const postsJson = JSON.stringify(venuePosts.slice(0, 20));
    
    db.prepare(`
      UPDATE venues SET
        instagram_tagged_posts = ?,
        crowd_last_updated = datetime('now')
      WHERE id = ?
    `).run(postsJson, venueId);
    
    saved++;
    
    if (saved % 50 === 0) {
      console.log(`   ✓ Saved ${saved} venues...`);
    }
  }
  
  console.log(`\n   ✅ Saved posts for ${saved} venues\n`);
  return saved;
}

async function main() {
  console.log('\n🎯 INSTAGRAM FEED SCRAPER\n');
  console.log('='.repeat(60));
  
  const venues = getVenuesNeedingPosts();
  console.log(`\n📋 ${venues.length} venues need Instagram posts\n`);
  
  try {
    const posts = await runInstagramPostScraper(venues);
    const saved = saveFeedPosts(posts, venues);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ FEED SCRAPING COMPLETE!');
    console.log(`   Venues enriched: ${saved}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(console.error);
