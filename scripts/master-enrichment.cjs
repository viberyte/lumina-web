const Database = require('better-sqlite3');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const fs = require('fs');

// ========================================
// CONFIGURATION
// ========================================

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const PHOTO_DIR = '/opt/viberyte/lumina-web/public/venue-photos';
const DELAY = 2000;

// ========================================
// LAYER 1: DATA STANDARDIZATION
// ========================================

function standardizeCity(state, city, neighborhood) {
  const cityLower = city?.toLowerCase() || '';
  const neighborhoodLower = neighborhood?.toLowerCase() || '';
  
  if (state === 'DC') return 'Washington DC';
  
  if (state === 'NY' || state === 'New York') {
    if (['new york', 'new york city', 'noho', 'nomad', 'soho', 'east village', 'koreatown', 'manhattan'].includes(cityLower)) {
      return 'Manhattan';
    }
    if (['brooklyn', 'williamsburg', 'bushwick', 'dumbo', 'park slope', 'bedford-stuyvesant', 'greenpoint', 'crown heights'].includes(cityLower)) {
      return 'Brooklyn';
    }
    if (['queens', 'astoria', 'long island city', 'flushing', 'jackson heights', 'elmhurst', 'forest hills', 'sunnyside', 'bayside', 'rego park', 'ridgewood'].includes(cityLower)) {
      return 'Queens';
    }
    if (['bronx', 'the bronx'].includes(cityLower)) return 'The Bronx';
    if (['staten island'].includes(cityLower)) return 'Staten Island';
    
    const brooklynHoods = ['williamsburg', 'bushwick', 'dumbo', 'park slope'];
    const queensHoods = ['astoria', 'long island city', 'flushing', 'jackson heights'];
    if (brooklynHoods.includes(neighborhoodLower)) return 'Brooklyn';
    if (queensHoods.includes(neighborhoodLower)) return 'Queens';
  }
  
  if (state === 'NJ' || state === 'New Jersey') {
    const northJersey = ['jersey city', 'newark', 'hoboken', 'weehawken', 'edgewater', 'montclair', 'clifton', 'paterson', 'secaucus', 'weehawken township'];
    const southJersey = ['camden', 'cherry hill', 'trenton', 'asbury park', 'neptune'];
    if (northJersey.includes(cityLower)) return 'North Jersey';
    if (southJersey.includes(cityLower)) return 'South Jersey';
    return 'North Jersey';
  }
  
  if (state === 'PA' && ['philadelphia', 'phila'].includes(cityLower)) return 'Philadelphia';
  if (state === 'MD' && cityLower === 'baltimore') return 'Baltimore';
  if (state === 'VA') {
    if (cityLower === 'norfolk') return 'Norfolk';
    if (cityLower === 'richmond') return 'Richmond';
    if (cityLower === 'arlington') return 'Arlington';
  }
  
  return city;
}

function standardizeCuisine(cuisine_primary, cuisine_secondary, name) {
  if (!cuisine_primary) return null;
  
  const consolidations = {
    'Latin American': 'Latin',
    'Modern American': 'New American',
    'Contemporary American': 'New American',
    'Pan Asian': 'Asian Fusion',
    'Asian': 'Asian Fusion'
  };
  
  if (consolidations[cuisine_primary]) return consolidations[cuisine_primary];
  
  if (cuisine_primary === 'American') {
    const nameLower = name?.toLowerCase() || '';
    if (nameLower.includes('soul') || cuisine_secondary?.includes('Southern')) return 'Soul Food';
    if (nameLower.includes('steak') || cuisine_secondary === 'Steakhouse') return 'Steakhouse';
    if (nameLower.includes('bbq') || cuisine_secondary === 'Barbecue') return 'BBQ';
    if (cuisine_secondary === 'Southern') return 'Southern';
    if (['Bar Food', 'Bar', 'Pub'].includes(cuisine_secondary)) return 'American Bar & Grill';
    if (nameLower.includes('brunch') || cuisine_secondary === 'Brunch') return 'Brunch';
    if (cuisine_secondary === 'Seafood') return 'Seafood';
    if (['Contemporary', 'New American', 'Fusion'].includes(cuisine_secondary)) return 'New American';
  }
  
  if (['N/A', 'null', 'Bar', 'Cocktails', 'Bar Food'].includes(cuisine_primary)) return null;
  
  return cuisine_primary;
}

function standardizeCategory(category) {
  if (!category) return 'dining';
  const lower = category.toLowerCase();
  
  if (['restaurant / dining', 'dining/brunch', 'breakfast & brunch', 'bakeries'].some(t => lower.includes(t))) return 'dining';
  if (['nightclub', 'bar', 'bars', 'dance_clubs', 'music_venues'].some(t => lower.includes(t))) return 'nightlife';
  if (['lounge', 'speakeasy', 'rooftop'].some(t => lower.includes(t))) return 'lounge';
  if (['cafe', 'cafes', 'coffee & tea'].some(t => lower.includes(t))) return 'cafe';
  if (['food_trucks', 'food-trucks'].some(t => lower.includes(t))) return 'food_truck';
  if (['fast-food', 'fast-casual'].some(t => lower.includes(t))) return 'fast_casual';
  if (category === 'dining/nightlife') return 'dining_nightlife';
  
  if (lower.includes('dining')) return 'dining';
  if (lower.includes('nightlife')) return 'nightlife';
  
  return 'dining';
}

// ========================================
// LAYER 2: QUALITY CHECKS
// ========================================

function shouldExclude(venue) {
  const name = venue.name?.toLowerCase() || '';
  const chains = ['mcdonalds', 'burger king', 'wendys', 'taco bell', 'kfc', 'subway', 'chipotle', 'panera', 'starbucks', 'dunkin'];
  if (chains.some(chain => name.includes(chain))) return { should_exclude: true, reason: 'Chain restaurant' };
  
  const rating = venue.google_rating || venue.rating || 0;
  if (rating > 0 && rating < 3.2) return { should_exclude: true, reason: 'Low rating' };
  
  if (name.includes('strip club') || name.includes('adult')) return { should_exclude: true, reason: 'Adult venue' };
  
  return { should_exclude: false, reason: null };
}

// ========================================
// LAYER 3: GOOGLE ENRICHMENT
// ========================================

async function enrichWithGoogle(venue) {
  if (!venue.google_place_id) return null;
  
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: venue.google_place_id,
        fields: 'name,rating,user_ratings_total,photos,reviews,business_status,opening_hours',
        key: GOOGLE_API_KEY
      }
    });
    
    const data = response.data.result;
    if (!data) return null;
    
    const photos = [];
    if (data.photos && data.photos.length > 0) {
      for (let i = 0; i < Math.min(10, data.photos.length); i++) {
        const photoRef = data.photos[i].photo_reference;
        const photoPath = `/venue-photos/venue-${venue.id}-${i + 1}.jpg`;
        
        try {
          const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`;
          const photoResponse = await axios.get(photoUrl, { responseType: 'arraybuffer' });
          fs.writeFileSync(`${PHOTO_DIR}/venue-${venue.id}-${i + 1}.jpg`, photoResponse.data);
          photos.push(photoPath);
        } catch (err) {
          console.error(`  ⚠️  Photo download failed`);
        }
      }
    }
    
    return {
      google_rating: data.rating,
      google_review_count: data.user_ratings_total,
      google_photos: JSON.stringify(photos),
      business_status: data.business_status,
      reviews: data.reviews ? JSON.stringify(data.reviews.slice(0, 5)) : null
    };
  } catch (error) {
    return null;
  }
}

// ========================================
// LAYER 4: MUSIC GENRE EXTRACTION
// ========================================

async function extractMusicGenres(reviews) {
  if (!reviews) return null;
  
  try {
    const reviewsData = typeof reviews === 'string' ? JSON.parse(reviews) : reviews;
    const reviewText = reviewsData.map(r => r.text).join('\n\n');
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract music genres from these reviews. Return ONLY a JSON array.

Reviews: ${reviewText}

Format: ["genre1", "genre2"]
Genres: afrobeats, amapiano, hip-hop, r&b, house, techno, jazz, latin, reggaeton, dancehall`
      }]
    });
    
    const content = message.content[0].text.trim();
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// ========================================
// LAYER 5: EMBEDDING GENERATION
// ========================================

async function generateEmbedding(venue) {
  try {
    const vibes = venue.primary_vibes ? JSON.parse(venue.primary_vibes).join(', ') : 'casual';
    const music = venue.music_genres_normalized ? JSON.parse(venue.music_genres_normalized).join(', ') : '';
    
    const description = `
${venue.name} is a ${venue.cuisine_primary || venue.category} venue in ${venue.neighborhood || venue.city}.
Atmosphere: ${vibes}
${music ? `Music: ${music}` : ''}
${venue.cuisine_style ? `Style: ${venue.cuisine_style}` : ''}
${venue.energy_level ? `Energy: ${venue.energy_level}` : ''}
    `.trim();
    
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: description
    });
    
    return JSON.stringify(response.data[0].embedding);
  } catch (error) {
    return null;
  }
}

// ========================================
// LAYER 6: ADVANCED TAGGING SYSTEM (THE SECRET SAUCE)
// ========================================

async function generateAdvancedTags(venue, reviews) {
  try {
    const reviewsData = reviews ? (typeof reviews === 'string' ? JSON.parse(reviews) : reviews) : [];
    const reviewText = reviewsData.map(r => r.text).slice(0, 3).join('\n');
    
    const prompt = `Analyze this venue and generate comprehensive tags. Return ONLY valid JSON.

Venue: ${venue.name}
Category: ${venue.category}
Cuisine: ${venue.cuisine_primary || 'N/A'}
Reviews: ${reviewText || 'No reviews'}

Generate tags for:

{
  "cuisine_style": "upscale" | "casual" | "fast-casual",
  "cuisine_tags": ["pasta-focused", "wine-heavy", etc],
  "primary_vibes": ["upscale", "romantic", "trendy"] (3-5 visible tags),
  "secondary_vibes": ["instagram-worthy", "date-friendly"] (hidden nuance),
  "pregame_suitable": true/false,
  "first_date_suitable": true/false,
  "anniversary_suitable": true/false,
  "girls_night_suitable": true/false,
  "guys_night_suitable": true/false,
  "brunch_spot": true/false,
  "late_night_spot": true/false,
  "solo_friendly": true/false,
  "business_meeting_ok": true/false,
  "large_group_suitable": true/false,
  "energy_level": "calm" | "moderate" | "lively" | "high",
  "energy_progression": ["can_wind_down", "can_turn_up", "steady"],
  "lounge_type": "upscale" | "casual" | "hookah" | "rooftop" | null,
  "lounge_vibes": ["calm", "lively", "mixy", "chill"] | null
}

Rules:
- primary_vibes = user-facing, core identity
- secondary_vibes = hidden matching layer
- energy_level = single value based on venue type
- lounge fields only if category = lounge`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.3
    });

    const content = completion.choices[0].message.content.trim();
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const tags = JSON.parse(cleanContent);
    
    return tags;
  } catch (error) {
    console.error(`  ❌ Tagging error: ${error.message}`);
    return null;
  }
}

// ========================================
// MAIN ENRICHMENT LOOP
// ========================================

async function main() {
  const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
  
  console.log('🚀 MASTER VENUE ENRICHMENT V2 STARTING...\n');
  
  // Add new columns
  const newColumns = [
    'embedding TEXT',
    'business_status TEXT',
    'cuisine_style TEXT',
    'cuisine_tags TEXT',
    'primary_vibes TEXT',
    'secondary_vibes TEXT',
    'pregame_suitable BOOLEAN DEFAULT 0',
    'first_date_suitable BOOLEAN DEFAULT 0',
    'anniversary_suitable BOOLEAN DEFAULT 0',
    'girls_night_suitable BOOLEAN DEFAULT 0',
    'guys_night_suitable BOOLEAN DEFAULT 0',
    'brunch_spot BOOLEAN DEFAULT 0',
    'late_night_spot BOOLEAN DEFAULT 0',
    'energy_level TEXT',
    'energy_progression TEXT',
    'lounge_type TEXT',
    'lounge_vibes TEXT'
  ];
  
  for (const col of newColumns) {
    try {
      db.exec(`ALTER TABLE venues ADD COLUMN ${col}`);
    } catch (e) {}
  }
  
  const venues = db.prepare(`
    SELECT * FROM venues 
    WHERE should_exclude = 0 
    AND (google_photos IS NULL OR google_photos = '' OR google_photos = '[]')
    ORDER BY id
  `).all();
  
  console.log(`📊 Found ${venues.length} venues to enrich\n`);
  
  let processed = 0, enhanced = 0, excluded = 0, failed = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    console.log(`\n[${i + 1}/${venues.length}] ${venue.name} (${venue.city}, ${venue.state})`);
    
    try {
      // LAYER 1: Standardization
      const standardizedCity = standardizeCity(venue.state, venue.city, venue.neighborhood);
      const standardizedCuisine = standardizeCuisine(venue.cuisine_primary, venue.cuisine_secondary, venue.name);
      const standardizedCategory = standardizeCategory(venue.category);
      
      // LAYER 2: Quality check
      const exclusionCheck = shouldExclude(venue);
      if (exclusionCheck.should_exclude) {
        db.prepare(`UPDATE venues SET should_exclude = 1, exclusion_reason = ? WHERE id = ?`)
          .run(exclusionCheck.reason, venue.id);
        console.log(`  ❌ Excluded: ${exclusionCheck.reason}`);
        excluded++;
        continue;
      }
      
      // LAYER 3: Google enrichment
      const googleData = await enrichWithGoogle(venue);
      if (!googleData) {
        console.log(`  ⚠️  No Google data`);
        failed++;
        continue;
      }
      
      if (googleData.business_status && googleData.business_status !== 'OPERATIONAL') {
        db.prepare(`UPDATE venues SET should_exclude = 1, exclusion_reason = ?, business_status = ? WHERE id = ?`)
          .run('Venue closed', googleData.business_status, venue.id);
        console.log(`  ❌ Excluded: Closed`);
        excluded++;
        continue;
      }
      
      // LAYER 4: Music genres
      const musicGenres = await extractMusicGenres(googleData.reviews);
      if (musicGenres) console.log(`  🎵 Music: ${JSON.stringify(musicGenres)}`);
      
      // LAYER 6: Advanced tagging (THE SECRET SAUCE)
      const advancedTags = await generateAdvancedTags({
        ...venue,
        category: standardizedCategory,
        cuisine_primary: standardizedCuisine
      }, googleData.reviews);
      
      if (advancedTags) {
        console.log(`  🏷️  Tags: ${advancedTags.energy_level}, ${advancedTags.primary_vibes?.slice(0, 2).join(', ')}`);
      }
      
      // LAYER 5: Embedding
      const embedding = await generateEmbedding({
        ...venue,
        ...googleData,
        ...advancedTags,
        music_genres_normalized: musicGenres,
        city: standardizedCity,
        cuisine_primary: standardizedCuisine,
        category: standardizedCategory
      });
      
      // Update database with ALL layers
      db.prepare(`
        UPDATE venues SET
          city = ?, cuisine_primary = ?, category = ?,
          google_rating = ?, google_review_count = ?, google_photos = ?,
          business_status = ?, music_genres_normalized = ?,
          cuisine_style = ?, cuisine_tags = ?,
          primary_vibes = ?, secondary_vibes = ?,
          pregame_suitable = ?, first_date_suitable = ?, anniversary_suitable = ?,
          girls_night_suitable = ?, guys_night_suitable = ?,
          brunch_spot = ?, late_night_spot = ?,
          energy_level = ?, energy_progression = ?,
          lounge_type = ?, lounge_vibes = ?,
          embedding = ?
        WHERE id = ?
      `).run(
        standardizedCity, standardizedCuisine, standardizedCategory,
        googleData.google_rating, googleData.google_review_count, googleData.google_photos,
        googleData.business_status, musicGenres ? JSON.stringify(musicGenres) : null,
        advancedTags?.cuisine_style, advancedTags?.cuisine_tags ? JSON.stringify(advancedTags.cuisine_tags) : null,
        advancedTags?.primary_vibes ? JSON.stringify(advancedTags.primary_vibes) : null,
        advancedTags?.secondary_vibes ? JSON.stringify(advancedTags.secondary_vibes) : null,
        advancedTags?.pregame_suitable ? 1 : 0,
        advancedTags?.first_date_suitable ? 1 : 0,
        advancedTags?.anniversary_suitable ? 1 : 0,
        advancedTags?.girls_night_suitable ? 1 : 0,
        advancedTags?.guys_night_suitable ? 1 : 0,
        advancedTags?.brunch_spot ? 1 : 0,
        advancedTags?.late_night_spot ? 1 : 0,
        advancedTags?.energy_level,
        advancedTags?.energy_progression ? JSON.stringify(advancedTags.energy_progression) : null,
        advancedTags?.lounge_type,
        advancedTags?.lounge_vibes ? JSON.stringify(advancedTags.lounge_vibes) : null,
        embedding,
        venue.id
      );
      
      console.log(`  ✅ Enhanced (${JSON.parse(googleData.google_photos).length} photos)`);
      enhanced++;
      
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      failed++;
    }
    
    processed++;
    
    if (processed % 50 === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = processed / elapsed;
      const remaining = Math.round((venues.length - processed) / rate);
      console.log(`\n📊 Progress: ${processed}/${venues.length} | Enhanced: ${enhanced} | Excluded: ${excluded} | Failed: ${failed}`);
      console.log(`⏱️  ETA: ${Math.round(remaining / 60)} minutes\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, DELAY));
  }
  
  db.close();
  
  const totalTime = Math.round((Date.now() - startTime) / 60000);
  console.log(`\n🎉 ENRICHMENT COMPLETE!`);
  console.log(`✅ Enhanced: ${enhanced}`);
  console.log(`❌ Excluded: ${excluded}`);
  console.log(`⚠️  Failed: ${failed}`);
  console.log(`⏱️  Time: ${totalTime} minutes`);
}

main().catch(console.error);
