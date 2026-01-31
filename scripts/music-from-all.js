import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Music genre patterns
const MUSIC_PATTERNS = {
  'afrobeats': [/afrobeat/i, /amapiano/i, /afro.?house/i, /afro.?fusion/i, /naija/i, /african.?music/i, /afro.?caribbean/i, /afropop/i, /wizkid/i, /burna/i, /davido/i],
  'hip-hop': [/hip.?hop/i, /hiphop/i, /\brap\b/i, /trap\b/i, /hip.?hop.?r&b/i, /drake/i, /kendrick/i, /migos/i, /future\b/i],
  'r&b': [/\br&b\b/i, /\brnb\b/i, /neo.?soul/i, /soul.?music/i, /r&b.?night/i, /slow.?jam/i],
  'dancehall': [/dancehall/i, /reggae/i, /jamaican/i, /bashment/i, /sean.?paul/i, /vybz/i, /popcaan/i],
  'soca': [/\bsoca\b/i, /caribbean.?party/i, /trini/i, /carnival/i, /\bfete\b/i, /jouvert/i, /mas\b/i],
  'latin': [/\bsalsa\b/i, /bachata/i, /merengue/i, /cumbia/i, /latin.?night/i, /noche.?latina/i, /musica.?latina/i, /latino/i, /latina/i],
  'reggaeton': [/reggaeton/i, /dembow/i, /perreo/i, /bad.?bunny/i, /daddy.?yankee/i, /j.?balvin/i, /ozuna/i],
  'house': [/house.?music/i, /deep.?house/i, /tech.?house/i, /\bhouse\b.*\bdj\b/i, /\bdj\b.*\bhouse\b/i, /disco.?house/i],
  'edm': [/\bedm\b/i, /electronic/i, /techno/i, /trance/i, /bass.?music/i, /dubstep/i],
  'live-jazz': [/live.?jazz/i, /jazz.?night/i, /jazz.?band/i, /jazz.?lounge/i, /\bjazz\b/i, /bebop/i, /smooth.?jazz/i],
  'live-band': [/live.?band/i, /cover.?band/i, /live.?performance/i, /live.?act/i],
  'top-40': [/top.?40/i, /top.?hits/i, /mainstream/i, /current.?hits/i, /chart.?topper/i],
};

// Combine all text from all sources
function getAllText(venue) {
  const parts = [];
  
  // Basic fields
  if (venue.name) parts.push(venue.name);
  if (venue.bio) parts.push(venue.bio);
  if (venue.description) parts.push(venue.description);
  if (venue.known_for) parts.push(venue.known_for);
  if (venue.menu_highlights) parts.push(venue.menu_highlights);
  if (venue.unified_tags) parts.push(venue.unified_tags);
  
  // Instagram captions
  if (venue.instagram_tagged_posts) {
    try {
      const posts = JSON.parse(venue.instagram_tagged_posts);
      if (Array.isArray(posts)) {
        posts.forEach(p => {
          if (p.caption) parts.push(p.caption);
        });
      }
    } catch {}
  }
  
  // TikTok text and hashtags
  if (venue.tiktok_videos) {
    try {
      const videos = JSON.parse(venue.tiktok_videos);
      if (Array.isArray(videos)) {
        videos.forEach(v => {
          if (v.text) parts.push(v.text);
          if (v.hashtags && Array.isArray(v.hashtags)) {
            parts.push(v.hashtags.join(' '));
          }
        });
      }
    } catch {}
  }
  
  // TikTok data (may have additional text)
  if (venue.tiktok_data) {
    try {
      const data = JSON.parse(venue.tiktok_data);
      if (data.bio) parts.push(data.bio);
      if (data.description) parts.push(data.description);
    } catch {}
  }
  
  // TikTok tags
  if (venue.tiktok_tags) {
    try {
      const tags = JSON.parse(venue.tiktok_tags);
      if (Array.isArray(tags)) parts.push(tags.join(' '));
    } catch {}
  }
  
  // Instagram insights
  if (venue.instagram_insights) {
    try {
      const insights = JSON.parse(venue.instagram_insights);
      if (insights.music_genres) parts.push(JSON.stringify(insights.music_genres));
      if (insights.vibe) parts.push(insights.vibe);
    } catch {}
  }
  
  return parts.join(' ');
}

// Extract genres from text
function extractGenres(text) {
  const found = new Set();
  
  for (const [genre, patterns] of Object.entries(MUSIC_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        found.add(genre);
        break;
      }
    }
  }
  
  return Array.from(found);
}

async function main() {
  console.log('🎵 Music Extraction from ALL Data Sources\n');
  
  // Get nightlife venues
  const venues = db.prepare(`
    SELECT id, name, category, bio, description, known_for, menu_highlights, unified_tags,
           instagram_tagged_posts, tiktok_videos, tiktok_data, tiktok_tags, instagram_insights,
           music_genres
    FROM venues 
    WHERE should_exclude = 0
      AND category IN ('nightclub', 'lounge', 'bar', 'rooftop')
      AND ((google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]')
        OR (gallery_photos IS NOT NULL AND gallery_photos != '' AND gallery_photos != '[]')
        OR (image_url IS NOT NULL AND image_url != ''))
  `).all();
  
  console.log(`📊 Processing ${venues.length} nightlife venues\n`);
  
  const updateStmt = db.prepare(`
    UPDATE venues 
    SET music_genres = ?
    WHERE id = ?
  `);
  
  let updated = 0, noChange = 0, noGenres = 0;
  const genreCounts = {};
  
  for (const venue of venues) {
    const allText = getAllText(venue);
    const genres = extractGenres(allText);
    
    // Track genre counts
    genres.forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
    
    // If we found genres, update
    if (genres.length > 0) {
      const currentGenres = venue.music_genres ? JSON.parse(venue.music_genres || '[]') : [];
      
      // Merge with existing (don't overwrite, add)
      const merged = [...new Set([...currentGenres.filter(g => g !== 'mixed'), ...genres])];
      
      if (JSON.stringify(merged.sort()) !== JSON.stringify(currentGenres.sort())) {
        updateStmt.run(JSON.stringify(merged), venue.id);
        console.log(`✓ ${venue.name} → ${merged.join(', ')}`);
        updated++;
      } else {
        noChange++;
      }
    } else {
      noGenres++;
    }
  }
  
  console.log(`\n✅ Complete:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   No change: ${noChange}`);
  console.log(`   No genres found: ${noGenres}`);
  
  console.log(`\n📊 Genre Distribution:`);
  Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([genre, count]) => {
      console.log(`   ${genre}: ${count}`);
    });
  
  // Final audit
  const audit = db.prepare(`
    SELECT 
      SUM(CASE WHEN music_genres IS NOT NULL AND music_genres != '' AND music_genres != '[]' AND music_genres != '["mixed"]' THEN 1 ELSE 0 END) as specific,
      SUM(CASE WHEN music_genres = '["mixed"]' THEN 1 ELSE 0 END) as mixed_only,
      COUNT(*) as total
    FROM venues 
    WHERE should_exclude = 0 AND category IN ('nightclub', 'lounge', 'bar', 'rooftop')
  `).get();
  
  console.log(`\n📊 Final Coverage (nightlife):`);
  console.log(`   Specific genres: ${audit.specific}/${audit.total}`);
  console.log(`   Mixed only: ${audit.mixed_only}/${audit.total}`);
  
  db.close();
}

main().catch(console.error);
