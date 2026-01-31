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
    SELECT id, name, city, address, instagram_handle
    FROM venues 
    WHERE city = 'Philadelphia' 
    AND state = 'PA'
    AND should_exclude = 0
  `).all();
}

// STEP 1: Instagram Hashtag Scraper
async function runInstagramHashtagScraper(venues) {
  console.log('\n📸 STEP 1: Running Instagram Hashtag Scraper...');
  console.log(`   Getting tagged posts for ${venues.length} venues\n`);
  
  // Create hashtags WITHOUT "#" symbol
  const hashtags = venues.slice(0, 200).map(v => 
    v.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '')
  ).filter(h => h.length > 3);
  
  console.log(`   Sample hashtags: ${hashtags.slice(0, 5).join(', ')}`);
  
  const input = {
    hashtags: hashtags,
    resultsLimit: 20
  };
  
  const run = await client.actor('apify/instagram-hashtag-scraper').call(input);
  
  console.log(`\n   ✅ Instagram hashtag scraper finished!`);
  console.log(`   📊 Run ID: ${run.id}`);
  console.log(`   💾 Downloading dataset...`);
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`   ✅ Downloaded ${items.length} tagged posts\n`);
  
  return items;
}

// STEP 2: TikTok Scraper
async function runTikTokScraper(venues) {
  console.log('\n🎥 STEP 2: Running TikTok Scraper...');
  console.log(`   Getting TikTok videos for ${venues.length} venues\n`);
  
  const searches = venues.slice(0, 200).map(v => `${v.name} Philadelphia`);
  
  console.log(`   Sample searches: ${searches.slice(0, 3).join(', ')}`);
  
  const input = {
    searchQueries: searches,
    resultsPerQuery: 10,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false
  };
  
  const run = await client.actor('clockworks/tiktok-scraper').call(input);
  
  console.log(`\n   ✅ TikTok scraper finished!`);
  console.log(`   📊 Run ID: ${run.id}`);
  console.log(`   💾 Downloading dataset...`);
  
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  console.log(`   ✅ Downloaded ${items.length} TikTok videos\n`);
  
  return items;
}

// Save functions...
function saveInstagramPosts(posts, venues) {
  console.log('\n💾 STEP 3: Saving Instagram tagged posts...');
  
  let saved = 0;
  const venueMap = new Map();
  
  for (const post of posts) {
    const hashtag = (post.hashtags?.[0] || '').toLowerCase().replace('#', '');
    
    const venue = venues.find(v => {
      const venueHashtag = v.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return hashtag.includes(venueHashtag.substring(0, 8)) || 
             venueHashtag.includes(hashtag.substring(0, 8));
    });
    
    if (!venue) continue;
    
    if (!venueMap.has(venue.id)) {
      venueMap.set(venue.id, []);
    }
    
    venueMap.get(venue.id).push({
      post_url: `https://www.instagram.com/p/${post.shortCode}/`,
      thumbnail_url: post.displayUrl,
      username: post.ownerUsername,
      likes: post.likesCount,
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
  }
  
  console.log(`   ✅ Saved tagged posts for ${saved} venues\n`);
  return saved;
}

function saveTikTokVideos(videos, venues) {
  console.log('\n💾 STEP 4: Saving TikTok videos...');
  
  let saved = 0;
  const venueMap = new Map();
  
  for (const video of videos) {
    const text = (video.text || '').toLowerCase();
    const desc = (video.desc || '').toLowerCase();
    const combined = text + ' ' + desc;
    
    const venue = venues.find(v => 
      combined.includes(v.name.toLowerCase().substring(0, 8))
    );
    
    if (!venue) continue;
    
    if (!venueMap.has(venue.id)) {
      venueMap.set(venue.id, []);
    }
    
    venueMap.get(venue.id).push({
      video_url: video.webVideoUrl || video.videoUrl,
      thumbnail_url: video.covers?.[0],
      username: video.authorMeta?.name || video.author,
      views: video.playCount || video.stats?.playCount,
      likes: video.diggCount || video.stats?.diggCount,
      timestamp: video.createTime,
      music: video.musicMeta?.musicName || video.music
    });
  }
  
  for (const [venueId, venueVideos] of venueMap.entries()) {
    const videosJson = JSON.stringify(venueVideos.slice(0, 15));
    
    db.prepare(`
      UPDATE venues SET
        tiktok_videos = ?,
        crowd_last_updated = datetime('now')
      WHERE id = ?
    `).run(videosJson, venueId);
    
    saved++;
  }
  
  console.log(`   ✅ Saved TikTok videos for ${saved} venues\n`);
  return saved;
}

async function main() {
  console.log('\n🚀 PHILLY CROWD INTELLIGENCE ENRICHMENT\n');
  console.log('='.repeat(60));
  
  const venues = getPhillyVenues();
  console.log(`\n📋 Loaded ${venues.length} Philly venues\n`);
  
  try {
    const instagramPosts = await runInstagramHashtagScraper(venues);
    const tiktokVideos = await runTikTokScraper(venues);
    
    const savedIG = saveInstagramPosts(instagramPosts, venues);
    const savedTT = saveTikTokVideos(tiktokVideos, venues);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CROWD ENRICHMENT COMPLETE!');
    console.log(`   Instagram posts: ${savedIG} venues`);
    console.log(`   TikTok videos: ${savedTT} venues`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(console.error);
