import Database from 'better-sqlite3';
import OpenAI from 'openai';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';
const CONCURRENCY = 5; // Lower to avoid rate limits
const MIN_TEXT_LENGTH = 120; // Guardrail 1: minimum signal

const ALLOWED_MUSIC = new Set([
  "hip-hop","r&b","afrobeats","dancehall","soca","latin","reggaeton",
  "house","edm","live-jazz","live-band","top-40","mixed"
]);

function safeJsonArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function getAllText(venue) {
  const parts = [];
  ['name', 'bio', 'description', 'known_for'].forEach(f => venue[f] && parts.push(venue[f]));
  
  if (venue.instagram_tagged_posts) {
    try {
      const posts = JSON.parse(venue.instagram_tagged_posts);
      if (Array.isArray(posts)) posts.forEach(p => p.caption && parts.push(p.caption));
    } catch {}
  }
  
  if (venue.tiktok_videos) {
    try {
      const videos = JSON.parse(venue.tiktok_videos);
      if (Array.isArray(videos)) videos.forEach(v => {
        if (v.text) parts.push(v.text);
        if (v.hashtags) parts.push(v.hashtags.join(' '));
      });
    } catch {}
  }
  
  return parts.join(' ');
}

// Extract hashtags for evidence
function extractHashtags(venue) {
  const hashtags = [];
  
  if (venue.tiktok_videos) {
    try {
      const videos = JSON.parse(venue.tiktok_videos);
      if (Array.isArray(videos)) videos.forEach(v => {
        if (v.hashtags) hashtags.push(...v.hashtags);
      });
    } catch {}
  }
  
  if (venue.instagram_tagged_posts) {
    try {
      const posts = JSON.parse(venue.instagram_tagged_posts);
      if (Array.isArray(posts)) posts.forEach(p => {
        if (p.caption) {
          const matches = p.caption.match(/#\w+/g);
          if (matches) hashtags.push(...matches.map(h => h.replace('#', '')));
        }
      });
    } catch {}
  }
  
  // Count frequency
  const freq = {};
  hashtags.forEach(h => freq[h.toLowerCase()] = (freq[h.toLowerCase()] || 0) + 1);
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20);
}

// Evidence-first prompt
const SYSTEM_PROMPT = `You classify music genres for NYC nightlife venues. Follow this hierarchy STRICTLY:

1. EXPLICIT MENTIONS: If hashtags/captions contain genre keywords (afrobeats, hiphop, latin, reggaeton, house, jazz), use those.
2. VENUE TYPE: If a jazz bar → live-jazz. If Latin restaurant → latin. If Caribbean spot → dancehall, soca.
3. NEIGHBORHOOD HINT (weak): Only use if no other signal. Brooklyn clubs often hip-hop/afrobeats. Washington Heights → latin.
4. UNCERTAIN: Return mixed only if truly no signal.

Output ONLY JSON:
{
  "music_genres": ["genre1", "genre2"],
  "confidence": 0.9,
  "source": "social" or "inferred",
  "evidence": "brief reason"
}

ALLOWED GENRES ONLY: hip-hop, r&b, afrobeats, dancehall, soca, latin, reggaeton, house, edm, live-jazz, live-band, top-40, mixed`;

async function aiEnrich(venue, allText, hashtags, retries = 2) {
  const hashtagStr = hashtags.slice(0, 15).map(([h, c]) => `#${h}(${c})`).join(' ');
  
  const context = `Name: ${venue.name}
Category: ${venue.category}
City: ${venue.city}
Neighborhood: ${venue.neighborhood || 'unknown'}

Top Hashtags: ${hashtagStr || 'none'}

Content (captions/bio):
${allText.substring(0, 2000)}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: context }],
        temperature: 0.2,
        max_tokens: 200
      });
      const content = response.choices[0].message.content.trim().replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(content);
    } catch (err) {
      if (attempt < retries && err.status === 429) {
        console.log(`  Rate limited, waiting 5s...`);
        await new Promise(r => setTimeout(r, 5000));
      } else if (attempt === retries) {
        return null;
      }
    }
  }
  return null;
}

async function main() {
  console.log('🎵 FINAL MUSIC ENRICHMENT (with guardrails)\n');
  
  const venues = db.prepare(`
    SELECT id, name, category, bio, description, known_for, city, neighborhood,
           instagram_tagged_posts, tiktok_videos, music_genres
    FROM venues 
    WHERE should_exclude = 0
      AND category IN ('nightclub', 'lounge', 'bar', 'rooftop')
      AND (music_genres IS NULL OR music_genres = '' OR music_genres = '[]' OR music_genres = '["mixed"]')
      AND ((google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]')
        OR (gallery_photos IS NOT NULL AND gallery_photos != '' AND gallery_photos != '[]')
        OR (image_url IS NOT NULL AND image_url != ''))
    LIMIT 300
  `).all();
  
  console.log(`📊 Processing ${venues.length} venues\n`);
  
  const updateStmt = db.prepare(`
    UPDATE venues SET music_genres = ?, music_confidence = ?, music_source = ? WHERE id = ?
  `);
  
  let updated = 0, skipped_no_signal = 0, kept_mixed = 0;
  
  for (let i = 0; i < venues.length; i += CONCURRENCY) {
    const batch = venues.slice(i, i + CONCURRENCY);
    
    await Promise.all(batch.map(async (venue) => {
      const allText = getAllText(venue);
      const hashtags = extractHashtags(venue);
      
      // Guardrail 1: Skip if not enough signal
      if (allText.length < MIN_TEXT_LENGTH && hashtags.length < 3) {
        console.log(`~ ${venue.name} → skipped (not enough signal)`);
        skipped_no_signal++;
        return;
      }
      
      const result = await aiEnrich(venue, allText, hashtags);
      
      if (result && result.music_genres && result.music_genres.length > 0) {
        const genres = result.music_genres.filter(g => ALLOWED_MUSIC.has(g));
        const hasSpecific = genres.some(g => g !== 'mixed');
        
        if (hasSpecific) {
          const finalGenres = genres.filter(g => g !== 'mixed');
          const confidence = result.confidence || 0.7;
          const source = result.source || 'ai';
          
          updateStmt.run(JSON.stringify(finalGenres), confidence, source, venue.id);
          console.log(`✓ ${venue.name} → ${finalGenres.join(', ')} (${source}, ${confidence})`);
          updated++;
        } else {
          updateStmt.run('["mixed"]', 0.3, 'ai_uncertain', venue.id);
          console.log(`~ ${venue.name} → mixed (uncertain)`);
          kept_mixed++;
        }
      } else {
        console.log(`- ${venue.name} → no result`);
        kept_mixed++;
      }
    }));
    
    const pct = Math.round((i + batch.length) / venues.length * 100);
    console.log(`--- ${pct}% (${updated} updated, ${skipped_no_signal} skipped, ${kept_mixed} mixed) ---\n`);
    
    // Small delay between batches to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n✅ COMPLETE`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (no signal): ${skipped_no_signal}`);
  console.log(`   Kept mixed: ${kept_mixed}`);
  
  const audit = db.prepare(`
    SELECT 
      SUM(CASE WHEN music_genres IS NOT NULL AND music_genres != '' AND music_genres != '[]' AND music_genres != '["mixed"]' THEN 1 ELSE 0 END) as specific,
      SUM(CASE WHEN music_source = 'social' THEN 1 ELSE 0 END) as from_social,
      SUM(CASE WHEN music_source = 'inferred' THEN 1 ELSE 0 END) as from_inferred,
      COUNT(*) as total
    FROM venues WHERE should_exclude = 0 AND category IN ('nightclub', 'lounge', 'bar', 'rooftop')
  `).get();
  
  console.log(`\n📊 FINAL COVERAGE:`);
  console.log(`   Specific music: ${audit.specific}/${audit.total} (${Math.round(audit.specific/audit.total*100)}%)`);
  console.log(`   From social: ${audit.from_social || 0}`);
  console.log(`   From inferred: ${audit.from_inferred || 0}`);
  
  db.close();
}

main().catch(console.error);
