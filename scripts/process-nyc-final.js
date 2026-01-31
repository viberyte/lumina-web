import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const anthropic = new Anthropic({ apiKey: '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' });

const GOOGLE_API_KEY = 'AIzaSyC8V3YWiqKjP22Fe-ALMBL77aN7qbkMdTA';

let costs = {
  googlePlacesCalls: 0,
  googlePhotoCalls: 0,
  anthropicInputTokens: 0,
  anthropicOutputTokens: 0,
  estimatedTotal: 0
};

const inputFile = '/opt/viberyte/lumina-web/scripts/pipeline/nyc_region/nyc_region_final.json';
const venues = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

console.log(`\n🎯 Processing ${venues.length} venues from nyc_region_final.json\n`);

function removeDuplicates(venues) {
  console.log('\n📋 STEP 1: Checking for duplicates (by place_id)...\n');
  
  // Use place_id for exact matching (more reliable)
  const existingVenues = db.prepare('SELECT place_id FROM venues WHERE place_id IS NOT NULL').all();
  const existingPlaceIds = new Set(existingVenues.map(v => v.place_id));
  
  const newVenues = venues.filter(venue => {
    if (!venue.place_id) return true; // Keep venues without place_id
    return !existingPlaceIds.has(venue.place_id);
  });
  
  console.log(`✅ Found ${venues.length - newVenues.length} duplicates (skipped)`);
  console.log(`✅ ${newVenues.length} new venues to process\n`);
  
  return newVenues;
}

async function enhanceWithGooglePlaces(venue) {
  if (!venue.place_id) {
    console.log(`⚠️  No place_id for ${venue.name}, skipping Google enhancement`);
    return venue;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${venue.place_id}&fields=rating,user_ratings_total,photos,formatted_phone_number,website,opening_hours&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    costs.googlePlacesCalls++;
    
    if (data.result) {
      venue.rating = data.result.rating;
      venue.total_ratings = data.result.user_ratings_total;
      venue.phone = data.result.formatted_phone_number;
      venue.website = data.result.website;
      venue.hours = data.result.opening_hours?.weekday_text;
      
      if (data.result.photos && data.result.photos.length > 0) {
        const photoRef = data.result.photos[0].photo_reference;
        venue.professional_photo_url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`;
        costs.googlePhotoCalls++;
      }
    }
    
    return venue;
  } catch (error) {
    console.error(`❌ Google Places error for ${venue.name}:`, error.message);
    return venue;
  }
}

function extractInstagram(website) {
  if (!website) return null;
  const match = website.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  return match ? match[1] : null;
}

async function tagWithLuminaSystem(venue) {
  const prompt = `Analyze this NYC venue and assign Lumina tags. Return ONLY valid JSON:

{
  "cuisine_primary": "Italian",
  "cuisine_secondary": null,
  "cuisine_style": "upscale",
  "cuisine_tags": ["pasta-focused", "wine-heavy"],
  "primary_vibes": ["upscale", "romantic"],
  "secondary_vibes": ["instagram-worthy", "date-friendly"],
  "pregame_suitable": false,
  "first_date_suitable": true,
  "anniversary_suitable": true,
  "girls_night_suitable": true,
  "guys_night_suitable": false,
  "brunch_spot": false,
  "late_night_spot": false,
  "solo_friendly": false,
  "business_meeting_ok": true,
  "large_group_suitable": false,
  "energy_level": "moderate",
  "energy_progression": ["steady_energy"],
  "lounge_type": null,
  "lounge_vibes": null,
  "one_line_pitch": "Upscale Italian with romantic vibes"
}

Venue: ${venue.name}
Neighborhood: ${venue.neighborhood || 'Unknown'}
Cuisine: ${venue.cuisine || 'Unknown'}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    costs.anthropicInputTokens += message.usage.input_tokens;
    costs.anthropicOutputTokens += message.usage.output_tokens;

    const result = JSON.parse(message.content[0].text);
    
    venue.cuisine_primary = result.cuisine_primary;
    venue.cuisine_secondary = result.cuisine_secondary;
    venue.cuisine_style = result.cuisine_style;
    venue.cuisine_tags = result.cuisine_tags?.join(',') || '';
    venue.primary_vibes = result.primary_vibes?.join(',') || '';
    venue.secondary_vibes = result.secondary_vibes?.join(',') || '';
    venue.pregame_suitable = result.pregame_suitable ? 1 : 0;
    venue.first_date_suitable = result.first_date_suitable ? 1 : 0;
    venue.anniversary_suitable = result.anniversary_suitable ? 1 : 0;
    venue.girls_night_suitable = result.girls_night_suitable ? 1 : 0;
    venue.guys_night_suitable = result.guys_night_suitable ? 1 : 0;
    venue.brunch_spot = result.brunch_spot ? 1 : 0;
    venue.late_night_spot = result.late_night_spot ? 1 : 0;
    venue.solo_friendly = result.solo_friendly ? 1 : 0;
    venue.business_meeting_ok = result.business_meeting_ok ? 1 : 0;
    venue.large_group_suitable = result.large_group_suitable ? 1 : 0;
    venue.energy_level = result.energy_level;
    venue.energy_progression = result.energy_progression?.join(',') || '';
    venue.lounge_type = result.lounge_type;
    venue.lounge_vibes = result.lounge_vibes?.join(',') || null;
    venue.one_line_pitch = result.one_line_pitch;
    
    return venue;
  } catch (error) {
    console.error(`❌ Claude error for ${venue.name}:`, error.message);
    return venue;
  }
}

function insertVenue(venue) {
  const stmt = db.prepare(`
    INSERT INTO venues (
      name, address, neighborhood, cuisine, latitude, longitude,
      rating, total_ratings, phone, website, price_level,
      professional_photo_url, instagram_handle, place_id, hours,
      cuisine_primary, cuisine_secondary, cuisine_style, cuisine_tags,
      primary_vibes, secondary_vibes,
      pregame_suitable, first_date_suitable, anniversary_suitable,
      girls_night_suitable, guys_night_suitable, brunch_spot,
      late_night_spot, solo_friendly, business_meeting_ok, large_group_suitable,
      energy_level, energy_progression,
      lounge_type, lounge_vibes, one_line_pitch
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    stmt.run(
      venue.name, venue.address, venue.neighborhood, venue.cuisine,
      venue.latitude, venue.longitude, venue.rating, venue.total_ratings,
      venue.phone, venue.website, venue.price_level,
      venue.professional_photo_url, venue.instagram_handle, venue.place_id,
      JSON.stringify(venue.hours),
      venue.cuisine_primary, venue.cuisine_secondary, venue.cuisine_style, venue.cuisine_tags,
      venue.primary_vibes, venue.secondary_vibes,
      venue.pregame_suitable, venue.first_date_suitable, venue.anniversary_suitable,
      venue.girls_night_suitable, venue.guys_night_suitable, venue.brunch_spot,
      venue.late_night_spot, venue.solo_friendly, venue.business_meeting_ok, venue.large_group_suitable,
      venue.energy_level, venue.energy_progression,
      venue.lounge_type, venue.lounge_vibes, venue.one_line_pitch
    );
    return true;
  } catch (error) {
    console.error(`❌ Database error for ${venue.name}:`, error.message);
    return false;
  }
}

async function processVenues() {
  const startTime = Date.now();
  const newVenues = removeDuplicates(venues);
  
  if (newVenues.length === 0) {
    console.log('\n✅ No new venues to process!\n');
    return;
  }

  console.log(`\n💰 COST ESTIMATE: $${(newVenues.length * 0.014).toFixed(2)}\n`);

  let processed = 0;
  let failed = 0;

  for (const venue of newVenues) {
    console.log(`\n[${processed + 1}/${newVenues.length}] ${venue.name}`);
    
    try {
      await enhanceWithGooglePlaces(venue);
      venue.instagram_handle = extractInstagram(venue.website);
      await tagWithLuminaSystem(venue);
      
      if (insertVenue(venue)) {
        processed++;
        console.log(`✅ COMPLETE`);
      } else {
        failed++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ FAILED:`, error.message);
      failed++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  costs.estimatedTotal = (
    (costs.googlePlacesCalls * 0.005) +
    (costs.googlePhotoCalls * 0.007) +
    (costs.anthropicInputTokens / 1000000 * 3) +
    (costs.anthropicOutputTokens / 1000000 * 15)
  ).toFixed(2);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`COMPLETE: ${processed} processed, ${failed} failed`);
  console.log(`Duration: ${duration} minutes`);
  console.log(`COST: $${costs.estimatedTotal}`);
  console.log(`${'='.repeat(60)}\n`);
}

processVenues().catch(console.error);
