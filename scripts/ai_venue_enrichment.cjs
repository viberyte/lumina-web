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

async function enrichVenue(venue) {
  const prompt = `Analyze this venue and return ONLY a valid JSON object.

VENUE:
- Name: ${venue.name}
- Current Category: ${venue.category}
- Description: ${venue.description || 'N/A'}
- Bio: ${venue.bio || 'N/A'}
- What to Expect: ${venue.what_to_expect || 'N/A'}
- Known For: ${venue.known_for || 'N/A'}
- Hours: ${venue.hours_json || 'N/A'}
- Neighborhood: ${venue.neighborhood || 'N/A'}

Return this exact JSON structure:
{
  "venue_subtype": "one of: rooftop, hookah-lounge, speakeasy, wine-bar, sports-bar, cigar-lounge, cocktail-lounge, upscale-lounge, casual-lounge, latin-lounge, hip-hop-lounge, afrobeats-lounge, upscale-dining, casual-dining, lounge-restaurant, brunch-spot, late-night-eats, hip-hop-club, latin-club, afrobeats-club, edm-club, upscale-club, dive-bar, neighborhood-bar",
  "energy_level": "one of: calm, low, medium, lively, high",
  "music_vibes": ["array of: hip-hop, r&b, afrobeats, latin, reggaeton, house, edm, techno, jazz, live-music, acoustic, pop, mixed"],
  "best_for": ["array of: date-night, first-date, girls-night, guys-night, birthday, celebration, pregame, late-night, chill-hangout, business, brunch, after-work, solo"],
  "vibe_words": ["array of: intimate, romantic, trendy, upscale, casual, lively, chill, bougie, underground, hidden-gem, iconic, vibrant, cozy, energetic, sexy, classy"],
  "has_hookah": true/false,
  "is_also_lounge": true/false (if restaurant that becomes lounge/club at night),
  "best_days": ["array of days when busiest: monday, tuesday, wednesday, thursday, friday, saturday, sunday"]
}

Return ONLY the JSON, no explanation.`;

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
        max_tokens: 400,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error(`API Error for ${venue.name}:`, data.error.message);
      return null;
    }
    
    const content = data.choices?.[0]?.message?.content?.trim();
    
    // Parse JSON from response
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
    // Build special_features JSON
    const specialFeatures = {
      has_hookah: enrichment.has_hookah || false,
      is_also_lounge: enrichment.is_also_lounge || false,
      best_days: enrichment.best_days || [],
    };

    const updateStmt = db.prepare(`
      UPDATE venues SET
        lounge_type = ?,
        energy_level = ?,
        music_genres = ?,
        context_tags = ?,
        vibe_tags = ?,
        special_features = ?,
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
      venueId
    );

    console.log(`✅ Updated: ${venueName} → ${enrichment.venue_subtype} | ${enrichment.energy_level} | hookah:${enrichment.has_hookah} | lounge:${enrichment.is_also_lounge}`);
    return true;
  } catch (error) {
    console.error(`DB Error for ${venueName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting AI Venue Enrichment...\n');

  // Get venues that need enrichment (nightlife + restaurants that might be lounges)
  const venues = db.prepare(`
    SELECT id, name, category, description, bio, what_to_expect, known_for, hours_json, neighborhood
    FROM venues
    WHERE category IN ('nightclub', 'lounge', 'bar', 'rooftop', 'restaurant')
      AND has_photo = 1
      AND (lounge_type IS NULL OR lounge_type = '' OR lounge_type = 'null')
    ORDER BY 
      CASE WHEN category IN ('nightclub', 'lounge', 'bar', 'rooftop') THEN 0 ELSE 1 END,
      google_rating DESC
    LIMIT 500
  `).all();

  console.log(`📊 Found ${venues.length} venues to enrich\n`);

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

    // Rate limiting
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
    LIMIT 20
  `).all();

  console.log('📊 Lounge Type Distribution:');
  summary.forEach(row => {
    console.log(`   ${row.lounge_type}: ${row.count}`);
  });
}

main().catch(console.error);
