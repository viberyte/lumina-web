import Database from 'better-sqlite3';
import OpenAI from 'openai';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';
const CONCURRENCY = 10;

// ============================================================
// ALLOWED ENUMS (clamp outputs - no junk tags)
// ============================================================
const ALLOWED_TAGS = new Set([
  "pregame","late-night","date-night","group-friendly","dancing","bottle-service",
  "live-dj","live-music","rooftop","outdoor","hookah","craft-cocktails","upscale",
  "trendy","chill-vibes","high-energy","brunch-spot","after-hours"
]);

const ALLOWED_MUSIC = new Set([
  "hip-hop","r&b","afrobeats","dancehall","soca","latin","reggaeton",
  "house","edm","live-jazz","live-band","top-40","mixed"
]);

// ============================================================
// SAFE HELPERS
// ============================================================
function safeJsonArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  }
  return [];
}

function clampArray(arr, allowedSet) {
  return arr.filter(x => typeof x === 'string' && allowedSet.has(x));
}

// ADDITIVE merge, keeps 'mixed' only if nothing else exists
function mergeArrays(existing, newItems, allowedSet) {
  const current = safeJsonArray(existing);
  const add = safeJsonArray(newItems);
  const merged = [...new Set([...current, ...add])].filter(Boolean);
  let clamped = clampArray(merged, allowedSet);
  const hasSpecific = clamped.some(x => x !== 'mixed');
  if (hasSpecific) clamped = clamped.filter(x => x !== 'mixed');
  if (!hasSpecific && clamped.length === 0 && current.includes('mixed')) clamped = ['mixed'];
  return clamped;
}

// ============================================================
// MUSIC GENRE PATTERNS (deterministic extraction)
// ============================================================
const MUSIC_PATTERNS = {
  'afrobeats': [/afrobeat/i, /amapiano/i, /afro.?house/i, /afro.?fusion/i, /naija/i, /african.?music/i, /afropop/i, /wizkid/i, /burna.?boy/i, /davido/i, /rema\b/i, /ayra/i, /tems\b/i],
  'hip-hop': [/hip.?hop/i, /hiphop/i, /\brap\b/i, /trap\b/i, /drake/i, /kendrick/i, /migos/i, /lil\s+\w+/i, /young\s+\w+/i],
  'r&b': [/\br&b\b/i, /\brnb\b/i, /neo.?soul/i, /r&b.?night/i, /slow.?jam/i, /usher/i, /beyonce/i, /sza\b/i],
  'dancehall': [/dancehall/i, /reggae/i, /jamaican/i, /bashment/i, /sean.?paul/i, /vybz/i, /popcaan/i, /shenseea/i],
  'soca': [/\bsoca\b/i, /caribbean.?party/i, /trini/i, /carnival/i, /\bfete\b/i, /jouvert/i, /machel/i],
  'latin': [/\bsalsa\b/i, /bachata/i, /merengue/i, /cumbia/i, /latin.?night/i, /noche.?latina/i, /musica.?latina/i],
  'reggaeton': [/reggaeton/i, /dembow/i, /perreo/i, /bad.?bunny/i, /daddy.?yankee/i, /j.?balvin/i, /ozuna/i, /karol.?g/i],
  'house': [/house.?music/i, /deep.?house/i, /tech.?house/i, /afro.?house/i, /disco.?house/i],
  'edm': [/\bedm\b/i, /electronic\b/i, /techno/i, /trance/i, /bass.?music/i, /dubstep/i],
  'live-jazz': [/live.?jazz/i, /jazz.?night/i, /jazz.?band/i, /jazz.?lounge/i, /\bjazz\b/i, /bebop/i],
  'live-band': [/live.?band/i, /cover.?band/i, /live.?performance/i, /live.?act/i],
  'top-40': [/top.?40/i, /top.?hits/i, /mainstream/i, /current.?hits/i, /chart.?topper/i],
};

// ============================================================
// UNIFIED TAG PATTERNS (deterministic extraction)
// ============================================================
const TAG_PATTERNS = {
  'late-night': [/late.?night/i, /after.?hours/i, /open.?late/i, /til.?\d+am/i, /until.?\d+am/i, /2am/i, /3am/i, /4am/i],
  'date-night': [/date.?night/i, /romantic/i, /intimate.?dinner/i, /couples/i, /anniversary/i],
  'pregame': [/pregame/i, /pre.?game/i, /happy.?hour/i, /before.?the.?club/i, /warm.?up/i],
  'group-friendly': [/group/i, /party.?of/i, /large.?party/i, /birthday/i, /celebration/i],
  'dancing': [/dancing/i, /dance.?floor/i, /come.?dance/i, /let.?s.?dance/i],
  'live-dj': [/\bdj\b/i, /live.?dj/i, /resident.?dj/i, /dj.?set/i, /spinning/i],
  'live-music': [/live.?music/i, /live.?band/i, /live.?performance/i, /live.?show/i],
  'rooftop': [/rooftop/i, /roof.?deck/i, /sky.?bar/i, /terrace/i, /skyline.?view/i],
  'outdoor': [/outdoor/i, /patio/i, /garden/i, /al.?fresco/i, /outside.?seating/i],
  'hookah': [/hookah/i, /shisha/i, /hookah.?lounge/i],
  'bottle-service': [/bottle.?service/i, /vip.?table/i, /vip.?section/i, /table.?service/i],
  'upscale': [/upscale/i, /luxury/i, /elegant/i, /sophisticated/i, /high.?end/i, /exclusive/i],
  'trendy': [/trendy/i, /hip\b/i, /hot.?spot/i, /popular/i, /buzzing/i],
  'chill-vibes': [/chill/i, /relaxed/i, /laid.?back/i, /mellow/i, /lounge.?vibe/i],
  'high-energy': [/high.?energy/i, /energetic/i, /wild/i, /crazy/i, /lit\b/i, /turnt/i, /hype/i],
  'craft-cocktails': [/craft.?cocktail/i, /mixolog/i, /artisan.?drink/i, /signature.?cocktail/i],
  'brunch-spot': [/brunch/i, /day.?party/i, /day.?drink/i, /bottomless/i, /mimosa/i],
  'after-hours': [/after.?hours/i, /after.?party/i, /til.?sunrise/i, /all.?night/i],
};

// ============================================================
// HELPER: Combine ALL text sources for a venue
// ============================================================
function getAllText(venue) {
  const parts = [];
  
  ['name', 'bio', 'description', 'known_for', 'menu_highlights'].forEach(f => {
    if (venue[f]) parts.push(venue[f]);
  });
  
  if (venue.instagram_tagged_posts) {
    try {
      const posts = JSON.parse(venue.instagram_tagged_posts);
      if (Array.isArray(posts)) posts.forEach(p => p.caption && parts.push(p.caption));
    } catch {}
  }
  
  if (venue.tiktok_videos) {
    try {
      const videos = JSON.parse(venue.tiktok_videos);
      if (Array.isArray(videos)) {
        videos.forEach(v => {
          if (v.text) parts.push(v.text);
          if (v.hashtags && Array.isArray(v.hashtags)) parts.push(v.hashtags.join(' '));
        });
      }
    } catch {}
  }
  
  if (venue.tiktok_data) {
    try {
      const data = JSON.parse(venue.tiktok_data);
      if (data.bio) parts.push(data.bio);
      if (data.description) parts.push(data.description);
    } catch {}
  }
  
  if (venue.tiktok_tags) {
    try {
      const tags = JSON.parse(venue.tiktok_tags);
      if (Array.isArray(tags)) parts.push(tags.join(' '));
    } catch {}
  }
  
  return parts.join(' ');
}

// ============================================================
// HELPER: Extract patterns from text
// ============================================================
function extractFromPatterns(text, patterns) {
  const found = new Set();
  for (const [key, regexes] of Object.entries(patterns)) {
    for (const pattern of regexes) {
      if (pattern.test(text)) {
        found.add(key);
        break;
      }
    }
  }
  return Array.from(found);
}

// ============================================================
// AI ENRICHMENT (for venues that need more)
// ============================================================
const SYSTEM_PROMPT = `You enrich venue data for Lumina, a nightlife discovery app. Based on ALL context (including Instagram captions and TikTok content), output JSON:

{
  "lounge_type": "upscale-lounge|cocktail-lounge|hookah-lounge|dive-bar|sports-bar|rooftop|nightclub|lounge-restaurant|speakeasy|null",
  "music_genres": ["hip-hop","r&b","afrobeats","dancehall","soca","latin","reggaeton","house","edm","live-jazz","live-band","top-40","mixed"],
  "energy_level": "high|lively|medium|calm|low",
  "unified_tags": ["pregame","late-night","date-night","group-friendly","dancing","bottle-service","live-dj","live-music","rooftop","outdoor","hookah","craft-cocktails","upscale","trendy","chill-vibes","high-energy","brunch-spot","after-hours"],
  "has_hookah": true|false,
  "confidence": 0.0-1.0
}

Use ONLY the exact values listed above. Be generous - if ANY signal suggests it, include it. Output ONLY valid JSON.`;

async function aiEnrich(venue, allText) {
  const context = `Name: ${venue.name}
Category: ${venue.category}
City: ${venue.city}, ${venue.neighborhood || ''}
Lounge Type: ${venue.lounge_type || 'unknown'}
Current Tags: ${venue.unified_tags || '[]'}
Current Music: ${venue.music_genres || '[]'}

--- SOCIAL MEDIA CONTENT ---
${allText.substring(0, 3000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: context }],
      temperature: 0.2,
      max_tokens: 400
    });
    const content = response.choices[0].message.content.trim().replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(content);
  } catch (err) {
    console.error(`  ✗ AI error: ${err.message}`);
    return null;
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🚀 COMPLETE VENUE ENRICHMENT (with clamping)');
  console.log('   Sources: DB + Instagram + TikTok + AI\n');
  
  const venues = db.prepare(`
    SELECT id, name, category, bio, description, known_for, menu_highlights, city, neighborhood,
           lounge_type, unified_tags, music_genres, energy_level, has_hookah,
           instagram_tagged_posts, tiktok_videos, tiktok_data, tiktok_tags
    FROM venues 
    WHERE should_exclude = 0
      AND category IN ('nightclub', 'lounge', 'bar', 'rooftop')
      AND ((google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]')
        OR (gallery_photos IS NOT NULL AND gallery_photos != '' AND gallery_photos != '[]')
        OR (image_url IS NOT NULL AND image_url != ''))
    ORDER BY 
      CASE WHEN music_genres IS NULL OR music_genres = '' OR music_genres = '[]' OR music_genres = '["mixed"]' THEN 0 ELSE 1 END,
      id
    LIMIT 500
  `).all();
  
  console.log(`📊 Processing ${venues.length} venues\n`);
  
  const updateStmt = db.prepare(`
    UPDATE venues SET
      music_genres = ?,
      unified_tags = ?,
      lounge_type = COALESCE(?, lounge_type),
      energy_level = COALESCE(?, energy_level),
      has_hookah = CASE WHEN ? = 1 THEN 1 ELSE has_hookah END,
      enriched_at = datetime('now')
    WHERE id = ?
  `);
  
  let processed = 0, aiCalls = 0;
  
  for (let i = 0; i < venues.length; i += CONCURRENCY) {
    const batch = venues.slice(i, i + CONCURRENCY);
    
    await Promise.all(batch.map(async (venue) => {
      // Step 1: Get all text
      const allText = getAllText(venue);
      
      // Step 2: Deterministic extraction
      const extractedMusic = extractFromPatterns(allText, MUSIC_PATTERNS);
      const extractedTags = extractFromPatterns(allText, TAG_PATTERNS);
      
      // Step 3: Merge + clamp (no junk tags)
      const currentMusic = safeJsonArray(venue.music_genres);
      const currentTags = safeJsonArray(venue.unified_tags);
      
      let finalMusic = mergeArrays(currentMusic, extractedMusic, ALLOWED_MUSIC);
      let finalTags = mergeArrays(currentTags, extractedTags, ALLOWED_TAGS);
      
      // Promote has_hookah from tags
      let hasHookah = venue.has_hookah;
      if (finalTags.includes('hookah')) hasHookah = 1;
      
      let loungeType = venue.lounge_type;
      let energyLevel = venue.energy_level;
      
      // Step 4: Smarter AI trigger
      const musicMissingOrMixed = finalMusic.length === 0 || (finalMusic.length === 1 && finalMusic[0] === 'mixed');
      const shouldCallAI = ['nightclub', 'lounge', 'bar', 'rooftop'].includes(venue.category) && musicMissingOrMixed && allText.length > 200;
      
      if (shouldCallAI) {
        const aiResult = await aiEnrich(venue, allText);
        if (aiResult && aiResult.confidence >= 0.5) {
          aiCalls++;
          if (aiResult.music_genres) finalMusic = mergeArrays(finalMusic, aiResult.music_genres, ALLOWED_MUSIC);
          if (aiResult.unified_tags) finalTags = mergeArrays(finalTags, aiResult.unified_tags, ALLOWED_TAGS);
          if (!loungeType && aiResult.lounge_type) loungeType = aiResult.lounge_type;
          if (!energyLevel && aiResult.energy_level) energyLevel = aiResult.energy_level;
          if (aiResult.has_hookah) hasHookah = 1;
        }
      }
      
      // Step 5: Update DB
      updateStmt.run(
        JSON.stringify(finalMusic),
        JSON.stringify(finalTags),
        loungeType,
        energyLevel,
        hasHookah,
        venue.id
      );
      
      const musicStr = finalMusic.length > 0 ? finalMusic.slice(0, 3).join(', ') : 'none';
      const tagStr = finalTags.length > 0 ? finalTags.slice(0, 3).join(', ') : 'none';
      console.log(`✓ ${venue.name} → music: [${musicStr}] | tags: [${tagStr}]`);
      processed++;
    }));
    
    const pct = Math.round((i + batch.length) / venues.length * 100);
    console.log(`--- ${pct}% (${processed} done, ${aiCalls} AI calls) ---\n`);
  }
  
  // Final audit
  console.log('\n✅ COMPLETE\n');
  
  const audit = db.prepare(`
    SELECT 
      SUM(CASE WHEN music_genres IS NOT NULL AND music_genres != '' AND music_genres != '[]' AND music_genres != '["mixed"]' THEN 1 ELSE 0 END) as specific_music,
      SUM(CASE WHEN unified_tags IS NOT NULL AND unified_tags != '' AND unified_tags != '[]' THEN 1 ELSE 0 END) as has_tags,
      SUM(CASE WHEN has_hookah = 1 THEN 1 ELSE 0 END) as has_hookah,
      COUNT(*) as total
    FROM venues WHERE should_exclude = 0 AND category IN ('nightclub', 'lounge', 'bar', 'rooftop')
  `).get();
  
  console.log('📊 NIGHTLIFE COVERAGE:');
  console.log(`   Specific music: ${audit.specific_music}/${audit.total}`);
  console.log(`   Has tags: ${audit.has_tags}/${audit.total}`);
  console.log(`   Has hookah: ${audit.has_hookah}/${audit.total}`);
  
  db.close();
}

main().catch(console.error);
