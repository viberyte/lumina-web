const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'lumina.db'));

const OPENAI_API_KEY = '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';
const MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';
const BATCH_SIZE = 10;
const DELAY_MS = 1500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function truncate(str, maxLen = 500) {
  if (!str) return 'N/A';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '...';
}

function parseJson(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

async function enrichVenue(venue) {
  // Parse Instagram insights if available
  let instagramData = '';
  if (venue.instagram_insights) {
    const insights = parseJson(venue.instagram_insights);
    if (insights && typeof insights === 'object') {
      instagramData = `
Instagram Insights:
- Crowd Type: ${insights.crowd_type || 'N/A'}
- Dress Code: ${insights.dress_code || 'N/A'}
- Music Vibe: ${insights.music_vibe || 'N/A'}
- Best Nights: ${JSON.stringify(insights.best_nights) || 'N/A'}
- Notable: ${JSON.stringify(insights.notable_mentions) || 'N/A'}`;
    }
  }

  // Parse TikTok data if available
  let tiktokData = '';
  if (venue.tiktok_data) {
    const tiktok = parseJson(venue.tiktok_data);
    if (tiktok && typeof tiktok === 'object') {
      tiktokData = `
TikTok Data:
- Tags: ${venue.tiktok_tags || 'N/A'}
- Score: ${venue.tiktok_score || 'N/A'}`;
    }
  }

  // Parse top reviews
  let reviewsData = '';
  if (venue.top_reviews) {
    reviewsData = `
Top Reviews: ${truncate(venue.top_reviews, 600)}`;
  }

  const prompt = `Analyze this venue using ALL available data and return ONLY a valid JSON object.

=== VENUE DATA ===
Name: ${venue.name}
Current Category: ${venue.category}
Neighborhood: ${venue.neighborhood || 'N/A'}
City: ${venue.city || 'N/A'}

Description: ${truncate(venue.description, 400)}
Bio: ${truncate(venue.bio, 400)}
What to Expect: ${truncate(venue.what_to_expect, 400)}
Known For: ${truncate(venue.known_for, 400)}

Hours: ${truncate(venue.hours_json, 300)}
${instagramData}
${tiktokData}
${reviewsData}

=== TASK ===
Based on ALL the data above (especially Instagram insights, reviews, and descriptions), determine:

1. **venue_subtype** (pick the BEST ONE):
   Lounges/Bars: rooftop, hookah-lounge, speakeasy, wine-bar, sports-bar, cigar-lounge, cocktail-lounge, upscale-lounge, casual-lounge, latin-lounge, hip-hop-lounge, afrobeats-lounge, jazz-lounge, karaoke-bar, dive-bar, neighborhood-bar, gay-bar, pool-bar
   Restaurants: upscale-dining, casual-dining, lounge-restaurant, brunch-spot, late-night-eats, supper-club
   Clubs: hip-hop-club, latin-club, afrobeats-club, edm-club, house-club, techno-club, upscale-club, mega-club

2. **energy_level**: calm, low, medium, lively, high

3. **music_vibes** (array, 1-4): hip-hop, r&b, afrobeats, amapiano, latin, reggaeton, house, edm, techno, jazz, live-music, acoustic, pop, rock, dancehall, reggae, soca, mixed, top-40

4. **best_for** (array, 2-5): date-night, first-date, girls-night, guys-night, birthday, celebration, pregame, late-night, chill-hangout, business, brunch, after-work, solo, dancing, bottle-service, hookah, live-entertainment

5. **vibe_words** (array, 2-5): intimate, romantic, trendy, upscale, casual, lively, chill, bougie, underground, hidden-gem, iconic, vibrant, cozy, energetic, sexy, classy, exclusive, instagram-worthy, dark, moody, loud, social

6. **has_hookah**: true/false (based on name, description, or reviews mentioning hookah/shisha)

7. **is_also_lounge**: true/false (if restaurant that transforms into lounge/club at night, like Tao, Lavo, etc.)

8. **best_days** (array): days when this venue is BUSIEST/BEST based on Instagram insights or typical patterns. Use: monday, tuesday, wednesday, thursday, friday, saturday, sunday

9. **crowd_type**: describe the typical crowd in 3-5 words (e.g., "young professionals, trendy", "diverse, energetic, late-20s")

10. **peak_time**: when is this venue at its best? (e.g., "10pm-2am", "happy hour", "late night after midnight")

Return ONLY valid JSON:
{
  "venue_subtype": "",
  "energy_level": "",
  "music_vibes": [],
  "best_for": [],
  "vibe_words": [],
  "has_hookah": false,
  "is_also_lounge": false,
  "best_days": [],
  "crowd_type": "",
  "peak_time": ""
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error(`API Error for ${venue.name}:`, data.error.message);
      return null;
    }
    
    const content = data.choices?.[0]?.message?.content?.trim();
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    console.error(`No JSON found for ${venue.name}`);
    return null;
  } catch (error) {
    console.error(`Error enriching ${venue.name}:`, error.message);
    return null;
  }
}

async function updateVenue(venueId, venueName, enrichment) {
  try {
    const specialFeatures = {
      has_hookah: enrichment.has_hookah || false,
      is_also_lounge: enrichment.is_also_lounge || false,
      best_days: enrichment.best_days || [],
      crowd_type: enrichment.crowd_type || '',
      peak_time: enrichment.peak_time || '',
    };

    const updateStmt = db.prepare(`
      UPDATE venues SET
        lounge_type = ?,
        energy_level = ?,
        music_genres = ?,
        context_tags = ?,
        vibe_tags = ?,
        special_features = ?,
        crowd_type_tags = ?,
        last_enhanced = datetime('now')
      WHERE id = ?
    `);

    updateStmt.run(
      enrichment.venue_subtype || null,
      enrichment.energy_level || null,
      JSON.stringify(enrichment.music_vibes || []),
      JSON.stringify(enrichment.best_for || []),
      JSON.stringify(enrichment.vibe_words || []),
      JSON.stringify(specialFeatures),
      enrichment.crowd_type || null,
      venueId
    );

    const hookahIcon = enrichment.has_hookah ? '💨' : '';
    const loungeIcon = enrichment.is_also_lounge ? '🍸' : '';
    const daysStr = enrichment.best_days?.length ? `📅${enrichment.best_days.join(',')}` : '';
    
    console.log(`✅ ${venueName}`);
    console.log(`   → ${enrichment.venue_subtype} | ${enrichment.energy_level} ${hookahIcon}${loungeIcon} ${daysStr}`);
    console.log(`   → Music: ${enrichment.music_vibes?.join(', ')}`);
    console.log(`   → Best for: ${enrichment.best_for?.join(', ')}`);
    console.log('');
    
    return true;
  } catch (error) {
    console.error(`DB Error for ${venueName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting AI Venue Enrichment V2 (Full Data)...\n');

  // Get venues prioritizing those with rich data
  const venues = db.prepare(`
    SELECT 
      id, name, category, city, neighborhood,
      description, bio, what_to_expect, known_for,
      hours_json, instagram_insights, tiktok_data, tiktok_tags, tiktok_score,
      top_reviews
    FROM venues
    WHERE category IN ('nightclub', 'lounge', 'bar', 'rooftop', 'restaurant', 'live_music')
      AND has_photo = 1
    ORDER BY 
      CASE WHEN instagram_insights IS NOT NULL AND instagram_insights != '' THEN 0 ELSE 1 END,
      CASE WHEN top_reviews IS NOT NULL AND top_reviews != '' THEN 0 ELSE 1 END,
      CASE WHEN category IN ('nightclub', 'lounge', 'bar', 'rooftop') THEN 0 ELSE 1 END,
      google_rating DESC
    LIMIT 600
  `).all();

  console.log(`📊 Found ${venues.length} venues to enrich\n`);
  console.log(`   With Instagram insights: ${venues.filter(v => v.instagram_insights).length}`);
  console.log(`   With reviews: ${venues.filter(v => v.top_reviews).length}`);
  console.log(`   With TikTok data: ${venues.filter(v => v.tiktok_data).length}\n`);

  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    console.log(`[${i + 1}/${venues.length}] Analyzing: ${venue.name}...`);

    const enrichment = await enrichVenue(venue);
    
    if (enrichment) {
      const success = await updateVenue(venue.id, venue.name, enrichment);
      if (success) enriched++;
      else failed++;
    } else {
      failed++;
    }

    if ((i + 1) % BATCH_SIZE === 0) {
      console.log(`\n⏳ Processed ${i + 1} venues. Pausing...\n`);
      await sleep(DELAY_MS * 2);
    } else {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n========================================');
  console.log(`✅ Enrichment Complete!`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Failed: ${failed}`);
  console.log('========================================\n');

  // Show summary
  const summary = db.prepare(`
    SELECT lounge_type, COUNT(*) as count 
    FROM venues 
    WHERE lounge_type IS NOT NULL AND lounge_type != '' AND lounge_type != 'null'
    GROUP BY lounge_type 
    ORDER BY count DESC
    LIMIT 25
  `).all();

  console.log('📊 Venue Subtype Distribution:');
  summary.forEach(row => {
    console.log(`   ${row.lounge_type}: ${row.count}`);
  });

  // Hookah venues
  const hookahCount = db.prepare(`
    SELECT COUNT(*) as count FROM venues 
    WHERE special_features LIKE '%"has_hookah":true%'
  `).get();
  console.log(`\n💨 Hookah Venues: ${hookahCount.count}`);

  // Also-lounge restaurants
  const loungeRestaurants = db.prepare(`
    SELECT COUNT(*) as count FROM venues 
    WHERE special_features LIKE '%"is_also_lounge":true%'
  `).get();
  console.log(`🍸 Restaurant-Lounges: ${loungeRestaurants.count}`);
}

main().catch(console.error);
