import Database from 'better-sqlite3';
import fs from 'fs';
import fetch from 'node-fetch';

// ============================================
// CONFIG - YOUR KEYS
// ============================================
const APIFY_TOKEN = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';
const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const RESULTS_DIR = '/opt/viberyte/lumina-web/data/tiktok-results';
const UNKNOWN_FILE = '/opt/viberyte/lumina-web/data/tiktok-unknown.json';

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// ============================================
// DISCOVERY SEARCHES
// ============================================
const DISCOVERY_SEARCHES = [
  'NYC lounge lit saturday',
  'Manhattan bar weekend vibes',
  'Brooklyn nightclub friday',
  'NYC rooftop drinks',
  'NYC afrobeats party',
  'NYC latin night club',
  'NYC hip hop lounge',
  'Brooklyn house music',
  'best date night bar nyc',
  'nyc bottle service club',
  'chill lounge manhattan',
  'Harlem lounge uptown',
  'Jersey City lounge nightlife',
  'Hoboken bar lit',
];

// ============================================
// VIBE DETECTION KEYWORDS
// ============================================
const VIBE_KEYWORDS = {
  music: {
    'hip-hop': ['hiphop', 'hip hop', 'rap', 'trap', 'rnb', 'r&b', 'drake', 'migos', 'future'],
    'house': ['house', 'techno', 'edm', 'electronic', 'dj set', 'deep house', 'tech house'],
    'afrobeats': ['afrobeats', 'afro', 'amapiano', 'burna', 'wizkid', 'dancehall', 'soca'],
    'latin': ['latin', 'reggaeton', 'salsa', 'bachata', 'bad bunny', 'dembow', 'merengue'],
    'live': ['live music', 'live band', 'jazz', 'acoustic', 'concert', 'open mic'],
    'top40': ['top 40', 'pop', 'hits', 'throwbacks', 'classics', 'mainstream'],
  },
  atmosphere: {
    'upscale': ['upscale', 'luxury', 'vip', 'bottle service', 'exclusive', 'classy', 'fancy'],
    'chill': ['chill', 'relaxed', 'laid back', 'cozy', 'lounge', 'mellow'],
    'turn-up': ['turn up', 'turnup', 'lit', 'party', 'wild', 'crazy', 'hype', 'packed'],
    'intimate': ['intimate', 'date night', 'romantic', 'quiet', 'conversation'],
    'trendy': ['trendy', 'instagram', 'aesthetic', 'photo op', 'influencer', 'viral'],
  },
  bestNights: {
    'friday': ['friday', 'fri night', 'fridays'],
    'saturday': ['saturday', 'sat night', 'saturdays', 'weekend'],
    'thursday': ['thursday', 'thirsty thursday', 'thursdays'],
    'sunday': ['sunday', 'day party', 'brunch', 'sunday funday'],
  }
};

// ============================================
// EXTRACT VENUE NAMES FROM TEXT
// ============================================
function extractVenueNames(text) {
  if (!text || typeof text !== 'string') return [];
  
  const venues = new Set();
  
  // @mentions
  const atMentions = text.match(/@([A-Za-z0-9_]+)/g) || [];
  atMentions.forEach(m => {
    const name = m.replace('@', '').replace(/_/g, ' ');
    if (name.length > 2) venues.add(name);
  });
  
  // "at [Venue]" pattern
  const atPattern = /\bat\s+([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+){0,2})/g;
  let match;
  while ((match = atPattern.exec(text)) !== null) {
    if (match[1].length > 2) venues.add(match[1]);
  }
  
  // Common venue suffixes
  const suffixPattern = /([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+)?)\s+(Bar|Lounge|Club|Rooftop|NYC|BK)/g;
  while ((match = suffixPattern.exec(text)) !== null) {
    venues.add(match[1] + ' ' + match[2]);
  }
  
  return [...venues];
}

// ============================================
// SAFELY GET HASHTAGS FROM VIDEO
// ============================================
function getHashtags(video) {
  const tags = [];
  
  // Try different possible hashtag formats from TikTok API
  if (video.hashtags) {
    if (Array.isArray(video.hashtags)) {
      video.hashtags.forEach(h => {
        if (typeof h === 'string') {
          tags.push(h.replace('#', '').toLowerCase());
        } else if (h && typeof h === 'object' && h.name) {
          tags.push(h.name.replace('#', '').toLowerCase());
        } else if (h && typeof h === 'object' && h.title) {
          tags.push(h.title.replace('#', '').toLowerCase());
        }
      });
    }
  }
  
  // Also extract from text/desc using regex
  const text = `${video.text || ''} ${video.desc || ''}`;
  const hashtagMatches = text.match(/#([A-Za-z0-9_]+)/g) || [];
  hashtagMatches.forEach(h => {
    tags.push(h.replace('#', '').toLowerCase());
  });
  
  return [...new Set(tags)];
}

// ============================================
// SEARCH TIKTOK VIA APIFY
// ============================================
async function searchTikTok(query, limit = 20) {
  console.log(`🔍 Searching: "${query}"`);
  
  try {
    const startResponse = await fetch(
      `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQueries: [query],
          resultsPerPage: limit,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
        }),
      }
    );
    
    if (!startResponse.ok) {
      const err = await startResponse.text();
      console.log(`   ❌ Apify error: ${err}`);
      return [];
    }
    
    const runData = await startResponse.json();
    const runId = runData.data.id;
    console.log(`   ⏳ Run: ${runId}`);
    
    // Poll for completion (max 3 minutes)
    let attempts = 0;
    while (attempts < 36) {
      await sleep(5000);
      
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusResponse.json();
      const status = statusData.data.status;
      
      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') {
        console.log(`   ❌ Run ${status}`);
        return [];
      }
      
      attempts++;
      process.stdout.write('.');
    }
    console.log('');
    
    // Get results
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
    );
    const results = await resultsResponse.json();
    
    console.log(`   ✅ Got ${results.length} videos`);
    return results;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return [];
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================
// ANALYZE CONTENT
// ============================================
function analyzeContent(videos) {
  const analysis = {
    music: {},
    atmosphere: {},
    bestNights: {},
    hashtags: {},
    mentionedVenues: [],
    totalViews: 0,
    totalLikes: 0,
    videoCount: videos.length,
  };
  
  videos.forEach(video => {
    try {
      // Get hashtags safely
      const hashtags = getHashtags(video);
      
      // Build text for analysis
      const text = `${video.text || ''} ${video.desc || ''} ${hashtags.join(' ')}`.toLowerCase();
      const originalText = `${video.text || ''} ${video.desc || ''}`;
      
      // Extract venues
      extractVenueNames(originalText).forEach(v => {
        if (!analysis.mentionedVenues.includes(v)) {
          analysis.mentionedVenues.push(v);
        }
      });
      
      // Count hashtags
      hashtags.forEach(tag => {
        if (tag && typeof tag === 'string') {
          analysis.hashtags[tag] = (analysis.hashtags[tag] || 0) + 1;
        }
      });
      
      // Engagement
      analysis.totalViews += video.playCount || video.plays || video.viewCount || 0;
      analysis.totalLikes += video.diggCount || video.likes || video.likeCount || 0;
      
      // Detect vibes
      Object.entries(VIBE_KEYWORDS).forEach(([category, keywords]) => {
        Object.entries(keywords).forEach(([vibe, terms]) => {
          terms.forEach(term => {
            if (text.includes(term.toLowerCase())) {
              if (!analysis[category][vibe]) analysis[category][vibe] = 0;
              analysis[category][vibe]++;
            }
          });
        });
      });
    } catch (e) {
      console.log(`   ⚠️ Error processing video: ${e.message}`);
    }
  });
  
  const getTop = (obj, n = 3) => {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => ({ tag: k, count: v }));
  };
  
  return {
    musicGenres: getTop(analysis.music),
    atmosphereVibes: getTop(analysis.atmosphere),
    bestNights: getTop(analysis.bestNights),
    topHashtags: getTop(analysis.hashtags, 10),
    mentionedVenues: analysis.mentionedVenues,
    engagement: {
      totalViews: analysis.totalViews,
      totalLikes: analysis.totalLikes,
      avgViews: analysis.videoCount > 0 ? Math.round(analysis.totalViews / analysis.videoCount) : 0,
      videoCount: analysis.videoCount,
    }
  };
}

// ============================================
// FIND VENUE IN YOUR DB
// ============================================
function findVenueInDB(db, venueName) {
  const clean = venueName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (clean.length < 3) return null;
  
  // Exact-ish match
  let venue = db.prepare(`
    SELECT id, name, city, category FROM venues 
    WHERE LOWER(REPLACE(REPLACE(name, '''', ''), '-', ' ')) LIKE ?
    AND should_exclude = 0
    LIMIT 1
  `).get(`%${clean}%`);
  
  if (venue) return venue;
  
  // Word match
  const words = clean.split(' ').filter(w => w.length > 3);
  if (words.length > 0) {
    const conditions = words.map(w => `LOWER(name) LIKE '%${w}%'`).join(' AND ');
    try {
      venue = db.prepare(`
        SELECT id, name, city, category FROM venues 
        WHERE ${conditions} AND should_exclude = 0
        LIMIT 1
      `).get();
    } catch (e) {}
  }
  
  return venue || null;
}

// ============================================
// UPDATE VENUE WITH TIKTOK DATA
// ============================================
function updateVenue(db, venueId, tiktokData) {
  const { musicGenres, atmosphereVibes, bestNights, engagement } = tiktokData;
  
  const tiktokTags = [];
  musicGenres.forEach(m => tiktokTags.push(`music:${m.tag}`));
  atmosphereVibes.forEach(a => tiktokTags.push(`vibe:${a.tag}`));
  bestNights.forEach(n => tiktokTags.push(`best:${n.tag}`));
  
  const tiktokScore = Math.min(100, Math.round(
    (engagement.avgViews / 10000) * 30 +
    (engagement.videoCount / 10) * 20 +
    (musicGenres.length > 0 ? 25 : 0) +
    (atmosphereVibes.length > 0 ? 25 : 0)
  ));
  
  try {
    db.prepare(`
      UPDATE venues SET
        tiktok_tags = ?,
        tiktok_score = ?,
        tiktok_data = ?,
        tiktok_updated = ?
      WHERE id = ?
    `).run(
      JSON.stringify(tiktokTags),
      tiktokScore,
      JSON.stringify(tiktokData),
      new Date().toISOString(),
      venueId
    );
    
    return { tiktokTags, tiktokScore };
  } catch (error) {
    console.log(`   ❌ Update failed: ${error.message}`);
    return null;
  }
}

// ============================================
// SAVE UNKNOWN VENUE FOR LATER
// ============================================
function saveUnknownVenue(venueName, sourceQuery, engagement) {
  let unknowns = [];
  try {
    if (fs.existsSync(UNKNOWN_FILE)) {
      unknowns = JSON.parse(fs.readFileSync(UNKNOWN_FILE, 'utf-8'));
    }
  } catch (e) {}
  
  // Check if already logged
  if (unknowns.some(u => u.name.toLowerCase() === venueName.toLowerCase())) {
    return;
  }
  
  unknowns.push({
    name: venueName,
    source: sourceQuery,
    engagement: engagement,
    foundAt: new Date().toISOString(),
  });
  
  fs.writeFileSync(UNKNOWN_FILE, JSON.stringify(unknowns, null, 2));
  console.log(`      📝 Logged to unknown venues`);
}

// ============================================
// MODE 1: ENHANCE EXISTING VENUES
// ============================================
async function enhanceExistingVenues(db, limit = 10) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 ENHANCE EXISTING VENUES`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  const venues = db.prepare(`
    SELECT id, name, city 
    FROM venues 
    WHERE category IN ('lounge', 'bar', 'club', 'night_club', 'cocktail_bar', 'speakeasy', 'rooftop')
    AND (tiktok_updated IS NULL OR tiktok_updated < datetime('now', '-30 days'))
    AND should_exclude = 0
    ORDER BY rating DESC NULLS LAST
    LIMIT ?
  `).all(limit);
  
  console.log(`Found ${venues.length} venues to enhance\n`);
  
  let enhanced = 0;
  
  for (const venue of venues) {
    console.log(`\n📍 ${venue.name} (${venue.city})`);
    
    const videos = await searchTikTok(`${venue.name} ${venue.city}`, 15);
    
    if (videos.length === 0) {
      console.log(`   ⚠️ No content found`);
      continue;
    }
    
    const analysis = analyzeContent(videos);
    const result = updateVenue(db, venue.id, analysis);
    
    if (result) {
      console.log(`   🎵 Music: ${analysis.musicGenres.map(m => m.tag).join(', ') || '-'}`);
      console.log(`   ✨ Vibe: ${analysis.atmosphereVibes.map(a => a.tag).join(', ') || '-'}`);
      console.log(`   📅 Best: ${analysis.bestNights.map(n => n.tag).join(', ') || '-'}`);
      console.log(`   👀 Avg views: ${analysis.engagement.avgViews.toLocaleString()}`);
      console.log(`   📊 Score: ${result.tiktokScore}`);
      enhanced++;
    }
    
    await sleep(3000);
  }
  
  return enhanced;
}

// ============================================
// MODE 2: DISCOVER (match to YOUR DB or log)
// ============================================
async function discoverVenues(db, searchLimit = 5) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔍 DISCOVER & MATCH VENUES`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  const searches = DISCOVERY_SEARCHES.slice(0, searchLimit);
  let matched = 0;
  let unknown = 0;
  
  for (const query of searches) {
    console.log(`\n🔎 "${query}"`);
    
    const videos = await searchTikTok(query, 20);
    if (videos.length === 0) continue;
    
    const analysis = analyzeContent(videos);
    console.log(`   Found ${analysis.mentionedVenues.length} venue mentions`);
    console.log(`   Top hashtags: ${analysis.topHashtags.slice(0,5).map(h => '#' + h.tag).join(' ')}`);
    
    for (const venueName of analysis.mentionedVenues) {
      console.log(`\n   🏪 ${venueName}`);
      
      const existing = findVenueInDB(db, venueName);
      
      if (existing) {
        console.log(`      ✅ MATCHED: ${existing.name} (ID: ${existing.id})`);
        
        // Update with TikTok data
        const result = updateVenue(db, existing.id, analysis);
        if (result) {
          console.log(`      📊 Updated score: ${result.tiktokScore}`);
          matched++;
        }
      } else {
        console.log(`      ❓ NOT IN DB`);
        saveUnknownVenue(venueName, query, analysis.engagement);
        unknown++;
      }
    }
    
    await sleep(3000);
  }
  
  return { matched, unknown };
}

// ============================================
// MAIN
// ============================================
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'both';
  const limit = parseInt(args[1]) || 5;
  
  console.log(`\n🎬 LUMINA TIKTOK SCRAPER`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Mode: ${mode}`);
  console.log(`Limit: ${limit}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const db = new Database(DB_PATH);
  
  // Ensure TikTok columns exist
  const columns = db.prepare("PRAGMA table_info(venues)").all().map(c => c.name);
  if (!columns.includes('tiktok_tags')) db.exec('ALTER TABLE venues ADD COLUMN tiktok_tags TEXT');
  if (!columns.includes('tiktok_score')) db.exec('ALTER TABLE venues ADD COLUMN tiktok_score INTEGER');
  if (!columns.includes('tiktok_data')) db.exec('ALTER TABLE venues ADD COLUMN tiktok_data TEXT');
  if (!columns.includes('tiktok_updated')) db.exec('ALTER TABLE venues ADD COLUMN tiktok_updated TEXT');
  
  let enhancedCount = 0;
  let discoveryResults = { matched: 0, unknown: 0 };
  
  if (mode === 'enhance' || mode === 'both') {
    enhancedCount = await enhanceExistingVenues(db, limit);
  }
  
  if (mode === 'discover' || mode === 'both') {
    discoveryResults = await discoverVenues(db, limit);
  }
  
  db.close();
  
  // Summary
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 SUMMARY`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Existing venues enhanced: ${enhancedCount}`);
  console.log(`Discovery matches: ${discoveryResults.matched}`);
  console.log(`Unknown venues logged: ${discoveryResults.unknown}`);
  console.log(`\nUnknown venues saved to: ${UNKNOWN_FILE}`);
  
  // Save run log
  fs.writeFileSync(
    `${RESULTS_DIR}/run-${Date.now()}.json`,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      mode,
      limit,
      enhancedCount,
      discoveryResults,
    }, null, 2)
  );
  
  console.log(`\n✅ Done!\n`);
}

main().catch(err => {
  console.error(`\n❌ Fatal error:`, err);
  process.exit(1);
});
