const Database = require('better-sqlite3');
const { ApifyClient } = require('apify-client');
const OpenAI = require('openai');
const fs = require('fs');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const apify = new ApifyClient({ token: process.env.APIFY_TOKEN });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BATCH_SIZE = 10;
const PROGRESS_FILE = '/opt/viberyte/lumina-web/data/enrich-progress.json';

let progress = { enriched: 0, updated: 0, excluded: 0, errors: 0, lastId: 0, timestamp: null };
if (fs.existsSync(PROGRESS_FILE)) {
  try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch {}
}

function saveProgress() {
  progress.timestamp = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function googleSearch(query) {
  const input = {
    queries: query,
    maxPagesPerQuery: 1,
    resultsPerPage: 5,
    mobileResults: false,
    languageCode: '',
    maxConcurrency: 1,
  };
  
  const run = await apify.actor('apify/google-search-scraper').call(input);
  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  return items;
}

async function enrichWithAI(venue, searchResults) {
  const context = searchResults.map(r => 
    `Title: ${r.title}\nSnippet: ${r.description}\nURL: ${r.url}`
  ).join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a venue data enrichment AI for a nightlife/dining app covering NYC metro area (Manhattan, Brooklyn, Queens, Bronx, Staten Island), New Jersey, Philadelphia, DC, Baltimore, Richmond, and Norfolk.

IMPORTANT RULES:
- NEVER exclude a venue just because it's in a different borough or city. We serve ALL these areas.
- ONLY mark is_valid=false if the venue is: permanently closed, not a real business, completely wrong type (like a gas station), or doesn't exist
- Low ratings (under 3.5) should NOT exclude — just report the rating

Return JSON:
{
  "is_valid": true/false (ONLY false if permanently closed or not a real venue),
  "exclude_reason": "only if is_valid is false - must be: permanently closed, not a real business, or does not exist",
  
  "primary_lens": "cuisine type: italian, japanese, chinese, korean, thai, vietnamese, indian, mexican, caribbean, soul_food, african, mediterranean, french, american, latin, seafood, steakhouse, greek, spanish, middle_eastern, fusion, or null if bar/lounge only",
  
  "venue_type": "restaurant, bar, lounge, club, rooftop, cafe, or hybrid like bar-restaurant",
  
  "cuisine_style": "upscale, casual, fast_casual, fine_dining, or null",
  
  "price_estimate": 1-4 (1=cheap, 2=moderate, 3=upscale, 4=fine dining),
  
  "correct_city": "the actual city/borough: Manhattan, Brooklyn, Queens, Bronx, Staten Island, Jersey City, Hoboken, Newark, Philadelphia, etc.",
  
  "neighborhood": "specific neighborhood: East Village, Williamsburg, Midtown, SoHo, Astoria, etc.",
  
  "google_rating": number or null (the rating you found, e.g. 4.5),
  
  "vibe_tags": ["array"] from: romantic, trendy, lively, chill, upscale, casual, late-night, brunch, outdoor, rooftop, live-music, dj, dancing, sports, craft-cocktails, wine-bar, hookah, date-night, group-friendly,
  
  "good_for_groups": true/false,
  "good_for_dates": true/false,
  "late_night": true/false,
  
  "confidence": "high/medium/low"
}`
      },
      {
        role: 'user',
        content: `Venue: ${venue.name}
Listed City: ${venue.city}
Current Cuisine: ${venue.cuisine_primary || venue.primary_lens || 'unknown'}
Current Category: ${venue.category || 'unknown'}

Search Results:
${context}`
      }
    ],
    temperature: 0.2,
  });

  try {
    const text = response.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    console.error('  AI parse error:', e.message);
    return null;
  }
}

async function processVenue(venue) {
  const typeHint = venue.category?.includes('club') || venue.category?.includes('lounge') 
    ? 'lounge bar' 
    : 'restaurant';
  const query = `${venue.name} ${venue.city} ${typeHint}`;
  
  try {
    const results = await googleSearch(query);
    if (!results || results.length === 0) return null;

    const organicResults = results[0]?.organicResults || [];
    if (organicResults.length === 0) return null;

    return await enrichWithAI(venue, organicResults.slice(0, 5));
  } catch (err) {
    console.error(`  [${venue.id}] Error:`, err.message);
    return null;
  }
}

async function main() {
  const venues = db.prepare(`
    SELECT id, name, city, cuisine_primary, primary_lens, category, neighborhood,
           cuisine_style, google_price_level, score_first_date, score_group_night, rating
    FROM venues 
    WHERE should_exclude = 0
      AND (google_verified IS NULL OR google_verified = 0)
      AND id > ?
    ORDER BY id
    LIMIT 500
  `).all(progress.lastId);

  console.log(`\n=== VENUE ENRICHMENT v2 ===`);
  console.log(`Found ${venues.length} venues to process (starting after ID ${progress.lastId})`);
  console.log(`Previous: ${progress.enriched} enriched, ${progress.updated} updated, ${progress.excluded} excluded\n`);

  const updateStmt = db.prepare(`
    UPDATE venues SET
      primary_lens = COALESCE(?, primary_lens),
      cuisine_primary = COALESCE(?, cuisine_primary),
      cuisine_style = COALESCE(?, cuisine_style),
      city = COALESCE(?, city),
      neighborhood = COALESCE(?, neighborhood),
      google_price_level = COALESCE(?, google_price_level),
      rating = COALESCE(?, rating),
      score_first_date = ?,
      score_group_night = ?,
      late_night_spot = COALESCE(?, late_night_spot),
      unified_tags = COALESCE(?, unified_tags),
      google_verified = 1,
      updated_at = datetime('now')
    WHERE id = ?
  `);
  
  const excludeStmt = db.prepare(`
    UPDATE venues 
    SET should_exclude = 1, google_verified = 1, exclude_reason = ?
    WHERE id = ?
  `);

  const verifyOnlyStmt = db.prepare(`
    UPDATE venues SET google_verified = 1 WHERE id = ?
  `);

  for (let i = 0; i < venues.length; i += BATCH_SIZE) {
    const batch = venues.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(venues.length/BATCH_SIZE)} ---`);

    for (const venue of batch) {
      console.log(`\n[${venue.id}] ${venue.name} (${venue.city})`);
      
      const result = await processVenue(venue);
      progress.lastId = venue.id;
      
      if (!result) {
        verifyOnlyStmt.run(venue.id);
        progress.enriched++;
        progress.errors++;
        console.log(`  → SKIPPED (no data)`);
        saveProgress();
        continue;
      }

      // Only exclude if truly invalid (closed, doesn't exist)
      if (!result.is_valid && result.exclude_reason && 
          (result.exclude_reason.toLowerCase().includes('closed') || 
           result.exclude_reason.toLowerCase().includes('not a real') ||
           result.exclude_reason.toLowerCase().includes('does not exist'))) {
        console.log(`  → EXCLUDING: ${result.exclude_reason}`);
        excludeStmt.run(result.exclude_reason, venue.id);
        progress.excluded++;
        saveProgress();
        continue;
      }

      const changes = [];
      
      // City correction
      if (result.correct_city && result.correct_city !== venue.city) {
        changes.push(`city: ${venue.city} → ${result.correct_city}`);
      }
      
      // Cuisine
      if (result.primary_lens && result.primary_lens !== venue.primary_lens) {
        changes.push(`lens: ${venue.primary_lens || 'none'} → ${result.primary_lens}`);
      }
      
      // Style
      if (result.cuisine_style && result.cuisine_style !== venue.cuisine_style) {
        changes.push(`style: ${result.cuisine_style}`);
      }
      
      // Neighborhood
      if (result.neighborhood && result.neighborhood !== venue.neighborhood) {
        changes.push(`hood: ${result.neighborhood}`);
      }
      
      // Rating
      if (result.google_rating && !venue.rating) {
        changes.push(`rating: ${result.google_rating}`);
      }

      const vibeTags = result.vibe_tags?.length > 0 ? JSON.stringify(result.vibe_tags) : null;
      
      const newDateScore = result.good_for_dates 
        ? Math.max(venue.score_first_date || 0, 60) 
        : venue.score_first_date;
      const newGroupScore = result.good_for_groups 
        ? Math.max(venue.score_group_night || 0, 60) 
        : venue.score_group_night;
      
      updateStmt.run(
        result.primary_lens,
        result.primary_lens,
        result.cuisine_style,
        result.correct_city,
        result.neighborhood,
        result.price_estimate,
        result.google_rating,
        newDateScore,
        newGroupScore,
        result.late_night ? 1 : 0,
        vibeTags,
        venue.id
      );

      if (changes.length > 0) {
        console.log(`  → UPDATED: ${changes.join(', ')}`);
        progress.updated++;
      } else {
        console.log(`  → VERIFIED`);
      }
      progress.enriched++;
      saveProgress();
      
      await new Promise(r => setTimeout(r, 1500));
    }

    console.log(`\n✓ Batch done | ${progress.enriched} enriched, ${progress.updated} updated, ${progress.excluded} excluded`);
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('\n========== FINAL ==========');
  console.log(`Enriched: ${progress.enriched}`);
  console.log(`Updated:  ${progress.updated}`);
  console.log(`Excluded: ${progress.excluded}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  saveProgress();
  process.exit(1);
});
