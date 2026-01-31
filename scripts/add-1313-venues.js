import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fs from 'fs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const anthropic = new Anthropic({ apiKey: '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' });
const openai = new OpenAI({ apiKey: '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' });

const GOOGLE_API_KEY = 'AIzaSyC8V3YWiqKjP22Fe-ALMBL77aN7qbkMdTA';

let costs = { googleSearch: 0, googleDetails: 0, photos: 0, claudeIn: 0, claudeOut: 0, gptTokens: 0 };

const venues = JSON.parse(fs.readFileSync('/opt/viberyte/lumina-web/scripts/pipeline/nyc_region/nyc_region_final.json', 'utf-8'));

console.log(`\n🎯 ADDING ${venues.length} VENUES (Quality Filtered)\n`);
console.log(`💰 Estimated Cost: ~$38\n`);

// QUALITY FILTER
function isTrashVenue(venue) {
  const name = (venue.venueName || '').toLowerCase();
  
  // Block strip clubs, gentlemen's clubs, adult venues
  const blockedKeywords = ['strip club', 'gentlemen club', 'gentlemens club', 'adult club', 'cabaret'];
  if (blockedKeywords.some(keyword => name.includes(keyword))) {
    return { trash: true, reason: 'Adult venue' };
  }
  
  // Skip low trend score
  if (venue.trendScore && venue.trendScore < 5) {
    return { trash: true, reason: 'Low trend score' };
  }
  
  // Skip suspicious names (all lowercase, no spaces)
  if (name === name.toLowerCase() && !name.includes(' ')) {
    return { trash: true, reason: 'Suspicious name' };
  }
  
  // Skip missing data
  if (!venue.venueName || !venue.neighborhood) {
    return { trash: true, reason: 'Missing data' };
  }
  
  return { trash: false };
}

async function searchGoogle(venueName, neighborhood) {
  try {
    const query = `${venueName} ${neighborhood || 'Manhattan'} New York`;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    costs.googleSearch++;
    
    if (data.results?.[0]) {
      return {
        place_id: data.results[0].place_id,
        address: data.results[0].formatted_address,
        latitude: data.results[0].geometry.location.lat,
        longitude: data.results[0].geometry.location.lng
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function getPlaceDetails(placeId) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,photos,formatted_phone_number,website,opening_hours&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    costs.googleDetails++;
    
    if (data.result) {
      const details = {
        rating: data.result.rating,
        phone: data.result.formatted_phone_number,
        website: data.result.website,
        hours: JSON.stringify({ weekday_text: data.result.opening_hours?.weekday_text || [] })
      };
      
      if (data.result.photos?.[0]) {
        const photoRef = data.result.photos[0].photo_reference;
        details.photo = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`;
        costs.photos++;
      }
      
      return details;
    }
    return {};
  } catch (error) {
    return {};
  }
}

function extractInstagram(website) {
  if (!website) return null;
  const match = website.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  return match ? match[1] : null;
}

async function tagWithClaude(venueData) {
  const prompt = `Analyze this venue and return ONLY valid JSON (NO markdown, NO backticks):

{"cuisine_primary":"Italian","cuisine_secondary":"Mediterranean","cuisine_style":"upscale","cuisine_tags":"pasta,wine,seafood","music_genres":"jazz,lounge","primary_vibes":"upscale,romantic","secondary_vibes":"instagram-worthy,date-friendly","pregame_suitable":0,"first_date_suitable":1,"anniversary_suitable":1,"girls_night_suitable":1,"guys_night_suitable":0,"brunch_spot":0,"late_night_spot":0,"solo_friendly":0,"business_meeting_ok":1,"large_group_suitable":0,"energy_level":"moderate","energy_progression":"steady_energy","lounge_type":null,"lounge_vibes":null,"why_recommended":"Brief pitch"}

IMPORTANT:
- cuisine_tags: ALWAYS include 2-5 specific food items (pasta, sushi, tacos, burgers, etc)
- music_genres: Include music style if venue plays music (hip-hop, afrobeats, reggaeton, house, jazz, live-music, dj, etc). Leave empty if quiet restaurant.

Venue: ${venueData.venueName}
Type: ${venueData.venueType}
Vibes: ${venueData.vibes?.join(', ')}
Music: ${venueData.musicGenres?.join(', ') || 'Unknown'}
Price: ${venueData.priceTier}`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }]
    });

    costs.claudeIn += msg.usage.input_tokens;
    costs.claudeOut += msg.usage.output_tokens;

    let text = msg.content[0].text.trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error(`Claude: ${error.message}`);
    return null;
  }
}

async function tagWithGPT(venueData) {
  const prompt = `Return ONLY valid JSON (no markdown):

{"cuisine_primary":"Italian","cuisine_secondary":"Mediterranean","cuisine_style":"upscale","cuisine_tags":"pasta,wine,seafood","music_genres":"jazz,lounge","primary_vibes":"upscale,romantic","secondary_vibes":"instagram-worthy,date-friendly","pregame_suitable":0,"first_date_suitable":1,"anniversary_suitable":1,"girls_night_suitable":1,"guys_night_suitable":0,"brunch_spot":0,"late_night_spot":0,"solo_friendly":0,"business_meeting_ok":1,"large_group_suitable":0,"energy_level":"moderate","energy_progression":"steady_energy","lounge_type":null,"lounge_vibes":null,"why_recommended":"Brief pitch"}

IMPORTANT:
- cuisine_tags: ALWAYS include 2-5 specific foods
- music_genres: Include if venue plays music, empty if quiet

Venue: ${venueData.venueName}
Type: ${venueData.venueType}
Vibes: ${venueData.vibes?.join(', ')}
Music: ${venueData.musicGenres?.join(', ') || 'Unknown'}
Price: ${venueData.priceTier}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 600
    });

    costs.gptTokens += completion.usage.total_tokens;

    let text = completion.choices[0].message.content.trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error(`GPT: ${error.message}`);
    return null;
  }
}

function insertVenue(venue, location, details, tags) {
  const stmt = db.prepare(`
    INSERT INTO venues (
      name, address, neighborhood, latitude, longitude, city, category,
      rating, phone, website, professional_photo_url, instagram_handle, hours_json, google_place_id,
      cuisine_primary, cuisine_secondary, cuisine_style, cuisine_tags, music_genres,
      primary_vibes, secondary_vibes,
      pregame_suitable, first_date_suitable, anniversary_suitable,
      girls_night_suitable, guys_night_suitable, brunch_spot,
      late_night_spot, solo_friendly, business_meeting_ok, large_group_suitable,
      energy_level, energy_progression,
      lounge_type, lounge_vibes, why_recommended,
      price_tier, dress_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    stmt.run(
      venue.venueName, location?.address, venue.neighborhood, location?.latitude, location?.longitude, 'New York', venue.venueType || 'Restaurant',
      details.rating, details.phone, details.website, details.photo, extractInstagram(details.website), details.hours, location?.place_id,
      tags.cuisine_primary, tags.cuisine_secondary, tags.cuisine_style, tags.cuisine_tags, tags.music_genres,
      tags.primary_vibes, tags.secondary_vibes,
      tags.pregame_suitable, tags.first_date_suitable, tags.anniversary_suitable,
      tags.girls_night_suitable, tags.guys_night_suitable, tags.brunch_spot,
      tags.late_night_spot, tags.solo_friendly, tags.business_meeting_ok, tags.large_group_suitable,
      tags.energy_level, tags.energy_progression,
      tags.lounge_type, tags.lounge_vibes, tags.why_recommended,
      venue.priceTier, venue.dressCode
    );
    return true;
  } catch (error) {
    console.error(`DB: ${error.message}`);
    return false;
  }
}

async function process() {
  const start = Date.now();
  let added = 0, failed = 0, skipped = 0;

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    console.log(`\n[${i + 1}/${venues.length}] ${venue.venueName}`);
    
    const qualityCheck = isTrashVenue(venue);
    if (qualityCheck.trash) {
      console.log(`🗑️  SKIPPED: ${qualityCheck.reason}`);
      skipped++;
      continue;
    }
    
    try {
      const location = await searchGoogle(venue.venueName, venue.neighborhood);
      if (!location) {
        console.log(`⚠️  Not found`);
        skipped++;
        continue;
      }
      
      const details = await getPlaceDetails(location.place_id);
      const tags = (i % 2 === 0) ? await tagWithClaude(venue) : await tagWithGPT(venue);
      
      if (!tags) {
        failed++;
        continue;
      }
      
      if (insertVenue(venue, location, details, tags)) {
        added++;
        console.log(`✅ ADDED`);
      } else {
        failed++;
      }
      
      await new Promise(r => setTimeout(r, 600));
    } catch (error) {
      console.error(`❌ ${error.message}`);
      failed++;
    }
  }

  const duration = ((Date.now() - start) / 1000 / 60).toFixed(2);
  const totalCost = (
    (costs.googleSearch * 0.032) +
    (costs.googleDetails * 0.017) +
    (costs.photos * 0.007) +
    (costs.claudeIn / 1000000 * 3) +
    (costs.claudeOut / 1000000 * 15) +
    (costs.gptTokens / 1000000 * 0.15)
  ).toFixed(2);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ DONE: ${added} added | ${skipped} skipped | ${failed} failed`);
  console.log(`Time: ${duration}min | Cost: $${totalCost}`);
  console.log(`${'='.repeat(60)}\n`);
}

process().catch(console.error);
