import Database from 'better-sqlite3';
import fetch from 'node-fetch';

const APIFY_TOKEN = 'apify_api_ScS2hZ9dHtd3snbk0LPnsbJEuv7Pdx3TkIgC';
const ACTOR_ID = 'clockworks~tiktok-scraper';
const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';

const db = new Database(DB_PATH);

async function runApifyActor(searchTerms) {
  console.log(`Starting Apify actor for ${searchTerms.length} search terms...`);
  
  const input = {
    searchQueries: searchTerms,
    resultsPerPage: 10,
    shouldDownloadVideos: true, // ✅ Download actual video files
    shouldDownloadCovers: true,  // ✅ Download cover images
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
    throw new Error(`Invalid API response: ${JSON.stringify(run)}`);
  }
  
  const runId = run.data.id;
  const datasetId = run.data.defaultDatasetId;
  console.log(`Run ID: ${runId}`);
  console.log(`Dataset ID: ${datasetId}`);

  // Wait for completion
  let status = 'RUNNING';
  while (status === 'RUNNING' || status === 'READY') {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const statusData = await statusResponse.json();
    status = statusData.data.status;
    console.log(`Status: ${status}`);
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Run failed with status: ${status}`);
  }

  // Get results
  const resultsResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  );
  
  const results = await resultsResponse.json();
  console.log(`✅ Got ${results.length} videos`);
  
  return results;
}

async function scrapeTikTokForVenues(limit = 50) {
  console.log('🎬 Starting TikTok scraper...\n');
  
  const venues = db.prepare(`
    SELECT id, name, city, address
    FROM venues 
    WHERE viberyte_certified = 1
      AND (tiktok_videos IS NULL OR tiktok_videos = '[]' OR tiktok_videos = '')
    LIMIT ?
  `).all(limit);

  console.log(`Found ${venues.length} venues to process\n`);

  const searchMap = {};
  const searchTerms = [];

  for (const venue of venues) {
    // Create hashtag from venue name
    const venueName = venue.name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '');
    
    const searchTerm = `#${venueName}`;
    searchTerms.push(searchTerm);
    searchMap[searchTerm] = venue;
  }

  console.log(`Scraping ${searchTerms.length} hashtags\n`);

  // Process in batches of 20 (Apify limit)
  const batchSize = 20;
  let allResults = [];

  for (let i = 0; i < searchTerms.length; i += batchSize) {
    const batch = searchTerms.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(searchTerms.length / batchSize);
    
    console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} hashtags)`);
    
    try {
      const results = await runApifyActor(batch);
      allResults = allResults.concat(results);
      console.log(`Got ${results.length} videos from this batch\n`);
    } catch (error) {
      console.error(`❌ Batch ${batchNum} failed:`, error.message);
    }

    // Rate limiting between batches
    if (i + batchSize < searchTerms.length) {
      console.log('⏳ Waiting 15s before next batch...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  console.log(`\n🎥 Total videos collected: ${allResults.length}\n`);

  // Group results by venue
  const venueVideos = {};
  
  for (const video of allResults) {
    const searchQuery = video.searchQuery;
    const venue = searchMap[searchQuery];
    
    if (!venue) continue;
    
    if (!venueVideos[venue.id]) {
      venueVideos[venue.id] = {
        venue: venue,
        videos: []
      };
    }
    
    // Extract comprehensive video data
    venueVideos[venue.id].videos.push({
      video_id: video.id,
      web_url: video.webVideoUrl,
      download_url: video.mediaUrls && video.mediaUrls.length > 0 ? video.mediaUrls[0] : null,
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

  let updatedCount = 0;
  
  for (const [venueId, data] of Object.entries(venueVideos)) {
    if (data.videos.length === 0) continue;
    
    // Calculate TikTok score based on engagement
    const totalViews = data.videos.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = data.videos.reduce((sum, v) => sum + v.likes, 0);
    const avgViews = totalViews / data.videos.length;
    const avgLikes = totalLikes / data.videos.length;
    
    // Score: views/1000 + likes/10 (max 100)
    const score = Math.min(100, Math.floor((avgViews / 1000) + (avgLikes / 10)));
    
    // Extract TikTok location ID if available
    const locationId = data.videos.find(v => v.location?.name)?.location?.name || null;
    
    updateStmt.run(
      JSON.stringify(data.videos),
      score,
      locationId,
      venueId
    );
    
    updatedCount++;
    console.log(`✅ ${data.venue.name}`);
    console.log(`   - ${data.videos.length} videos | Score: ${score} | Views: ${avgViews.toFixed(0)} avg\n`);
  }

  console.log(`\n🎉 Complete! Updated ${updatedCount}/${venues.length} venues with TikTok content`);
  console.log(`💰 Estimated cost: $${(allResults.length * 0.004).toFixed(2)}\n`);
}

// Run the scraper
const venueLimit = parseInt(process.argv[2]) || 50;

scrapeTikTokForVenues(venueLimit)
  .then(() => {
    db.close();
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    db.close();
    process.exit(1);
  });
