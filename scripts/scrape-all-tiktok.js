import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import fs from 'fs';

const APIFY_TOKEN = 'apify_api_ScS2hZ9dHtd3snbk0LPnsbJEuv7Pdx3TkIgC';
const ACTOR_ID = 'clockworks~tiktok-scraper';
const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const LOG_FILE = '/opt/viberyte/lumina-web/logs/tiktok-scrape.log';

const db = new Database(DB_PATH);

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

async function runApifyActor(searchTerms, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const input = {
        searchQueries: searchTerms,
        resultsPerPage: 10,
        shouldDownloadVideos: true,
        shouldDownloadCovers: true,
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
      
      if (!run.data || !run.data.id) {
        throw new Error(`Invalid API response`);
      }
      
      const runId = run.data.id;
      const datasetId = run.data.defaultDatasetId;

      // Wait for completion
      let status = 'RUNNING';
      while (status === 'RUNNING' || status === 'READY') {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
        );
        const statusData = await statusResponse.json();
        status = statusData.data.status;
      }

      if (status !== 'SUCCEEDED') {
        throw new Error(`Run failed with status: ${status}`);
      }

      // Get results
      const resultsResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
      );
      
      const results = await resultsResponse.json();
      return results;
      
    } catch (error) {
      log(`⚠️  Attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

async function scrapeAllVenues() {
  log('🎬 Starting FULL TikTok scrape of all venues');
  
  const totalVenues = db.prepare(`
    SELECT COUNT(*) as count
    FROM venues 
    WHERE (tiktok_videos IS NULL OR tiktok_videos = '[]' OR tiktok_videos = '')
  `).get().count;

  log(`📊 Total venues to scrape: ${totalVenues}`);
  log(`💰 Estimated cost: $${(totalVenues * 10 * 0.004).toFixed(2)}`);
  log(`⏱️  Estimated time: ${Math.ceil(totalVenues / 20 * 2)} minutes\n`);

  const batchSize = 20;
  let processedVenues = 0;
  let totalVideos = 0;
  let totalCost = 0;

  while (processedVenues < totalVenues) {
    const venues = db.prepare(`
      SELECT id, name, city, address
      FROM venues 
      WHERE (tiktok_videos IS NULL OR tiktok_videos = '[]' OR tiktok_videos = '')
      LIMIT ?
    `).all(batchSize);

    if (venues.length === 0) break;

    const searchMap = {};
    const searchTerms = [];

    for (const venue of venues) {
      const venueName = venue.name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '');
      
      const searchTerm = `#${venueName}`;
      searchTerms.push(searchTerm);
      searchMap[searchTerm] = venue;
    }

    const batchNum = Math.ceil((processedVenues + 1) / batchSize);
    const totalBatches = Math.ceil(totalVenues / batchSize);
    
    log(`\n📦 Batch ${batchNum}/${totalBatches} (${searchTerms.length} venues)`);
    
    try {
      const results = await runApifyActor(searchTerms);
      
      // Group by venue
      const venueVideos = {};
      
      for (const video of results) {
        const venue = searchMap[video.searchQuery];
        if (!venue) continue;
        
        if (!venueVideos[venue.id]) {
          venueVideos[venue.id] = { venue, videos: [] };
        }
        
        venueVideos[venue.id].videos.push({
          video_id: video.id,
          web_url: video.webVideoUrl,
          download_url: video.mediaUrls?.[0] || null,
          cover_url: video.videoMeta?.coverUrl,
          duration: video.videoMeta?.duration,
          width: video.videoMeta?.width,
          height: video.videoMeta?.height,
          caption: video.text,
          author: video.authorMeta?.name,
          author_verified: video.authorMeta?.verified || false,
          author_followers: video.authorMeta?.fans,
          author_avatar: video.authorMeta?.avatar,
          likes: video.diggCount || 0,
          comments: video.commentCount || 0,
          shares: video.shareCount || 0,
          views: video.playCount || 0,
          created_at: video.createTimeISO,
          hashtags: video.hashtags?.map(h => h.name) || [],
          music: {
            name: video.musicMeta?.musicName,
            author: video.musicMeta?.musicAuthor,
            url: video.musicMeta?.playUrl
          },
          location: video.locationMeta ? {
            name: video.locationMeta.locationName,
            address: video.locationMeta.address,
            city: video.locationMeta.city
          } : null
        });
      }

      // Update database
      const updateStmt = db.prepare(`
        UPDATE venues 
        SET tiktok_videos = ?,
            tiktok_score = ?,
            tiktok_updated = datetime('now'),
            tiktok_location_id = ?
        WHERE id = ?
      `);

      for (const [venueId, data] of Object.entries(venueVideos)) {
        if (data.videos.length === 0) continue;
        
        const totalViews = data.videos.reduce((sum, v) => sum + v.views, 0);
        const totalLikes = data.videos.reduce((sum, v) => sum + v.likes, 0);
        const avgViews = totalViews / data.videos.length;
        const score = Math.min(100, Math.floor((avgViews / 1000) + (totalLikes / data.videos.length / 10)));
        const locationId = data.videos.find(v => v.location?.name)?.location?.name || null;
        
        updateStmt.run(
          JSON.stringify(data.videos),
          score,
          locationId,
          venueId
        );
        
        log(`   ✅ ${data.venue.name} (${data.videos.length} videos, score: ${score})`);
      }
      
      totalVideos += results.length;
      totalCost += results.length * 0.004;
      processedVenues += venues.length;
      
      log(`   📊 Progress: ${processedVenues}/${totalVenues} venues | ${totalVideos} videos | $${totalCost.toFixed(2)}`);
      
      // Rate limiting
      if (processedVenues < totalVenues) {
        log('   ⏳ Waiting 20s...');
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
      
    } catch (error) {
      log(`   ❌ Batch failed: ${error.message}`);
      log('   ⏭️  Skipping to next batch...');
    }
  }

  log(`\n🎉 COMPLETE!`);
  log(`📊 Final stats:`);
  log(`   - Venues processed: ${processedVenues}`);
  log(`   - Videos collected: ${totalVideos}`);
  log(`   - Total cost: $${totalCost.toFixed(2)}`);
}

// Create logs directory
if (!fs.existsSync('/opt/viberyte/lumina-web/logs')) {
  fs.mkdirSync('/opt/viberyte/lumina-web/logs');
}

scrapeAllVenues()
  .then(() => {
    db.close();
    process.exit(0);
  })
  .catch(error => {
    log(`💥 Fatal error: ${error}`);
    db.close();
    process.exit(1);
  });
