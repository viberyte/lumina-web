const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');

const GOOGLE_API_KEY = 'AIzaSyDvMcJrFjAc_Wrb_FJzqVRWv_z00YB_j0k';
const MIN_REVIEWS = 100;
const MIN_RATING = 4.2;
const MIN_PHOTOS = 5;
const MAX_PHOTOS = 10;
const SEARCH_DELAY = 1200;
const DETAIL_DELAY = 300;

const CITIES = [
  //done
  //done
  { key: "newark", query: "Newark NJ" },
  { key: "jersey_city", query: "Jersey City NJ" },
  { key: "hoboken", query: "Hoboken NJ" },
];

// Name-based instant kills
const KILL_WORDS = [
  'food truck', 'taco truck', 'halal food', 'halal cart', 'food cart',
  'catering', 'grocery', 'bodega', 'food stand', 'deli',
  'pizza hut', 'mcdonalds', 'subway', 'popeyes', 'wendys',
  'burger king', 'kfc', 'taco bell', 'dominos', 'chipotle',
  'dunkin', 'starbucks', 'applebees', 'ihop', 'dennys',
  'buffet', 'cafeteria', 'food court', 'commissary',
  'event space', 'event venue', 'banquet hall', 'wedding venue',
  'liquor store', 'wine & liquor', 'smoke shop',
];

// Google type instant kills
const KILL_TYPES = [
  'meal_takeaway', 'meal_delivery', 'convenience_store',
  'gas_station', 'grocery_or_supermarket', 'liquor_store',
  'supermarket', 'drugstore', 'laundry',
];

function isLuminaWorthy(place, details) {
  const name = (place.name || '').toLowerCase();
  const types = place.types || [];
  const services = details ? {
    dine_in: details.dine_in || false,
    reservable: details.reservable || false,
  } : {};
  const photoCount = details?.photos?.length || 0;
  const hasWebsite = !!details?.website;
  const isNightlife = types.some(t => ['bar', 'night_club'].includes(t));

  // Name kills
  for (const kw of KILL_WORDS) {
    if (name.includes(kw)) return { pass: false, reason: `name: ${kw}` };
  }

  // Business entity names
  if (/\b(inc\.?|llc|corp\.?)\s*\.?\s*$/.test(name)) return { pass: false, reason: 'business entity' };

  // Market (not market hall/bar)
  if (/\bmarket\b/.test(name) && !/market hall|market bar/.test(name)) return { pass: false, reason: 'market' };

  // Google type kills
  if (types.some(t => KILL_TYPES.includes(t)) && !types.includes('restaurant') && !types.includes('bar')) {
    return { pass: false, reason: 'bad google type' };
  }

  // Must have enough photos (aesthetic check)
  if (photoCount < MIN_PHOTOS) return { pass: false, reason: `only ${photoCount} photos` };

  // Must have website OR be a nightlife venue
  if (!hasWebsite && !isNightlife) return { pass: false, reason: 'no website' };

  // Dining venues must have dine-in
  if (!isNightlife && !services.dine_in) return { pass: false, reason: 'no dine-in' };

  return { pass: true };
}

const WORLD_QUERIES = {
  outside: [
    "afrobeats lounge","afrobeats club","afrobeats nightclub",
    "hip hop lounge nightlife","hip hop nightclub","hip hop club",
    "r&b lounge nightlife","r&b nightclub","neo soul lounge",
    "caribbean lounge nightlife","caribbean nightclub",
    "dancehall bar","dancehall club","soca party venue",
    "afro caribbean nightclub","black owned bar","black owned lounge",
    "black owned rooftop bar","black owned nightclub",
    "open format nightclub","bottle service club",
    "hip hop party venue","urban rooftop bar",
  ],
  latin_nights: [
    "latin nightclub","latin cocktail bar","latin inspired lounge",
    "latin rooftop bar","mezcal bar nightlife","tequila bar nightlife",
    "reggaeton club","salsa club","bachata lounge","cumbia bar",
    "latin dance club","latin lounge nightlife",
    "dominican nightclub","puerto rican lounge",
  ],
  pulse: [
    "house music club","edm nightclub","techno club",
    "dj lounge nightlife","underground dance club",
    "warehouse party venue","electronic music venue",
    "deep house lounge","rooftop dj bar",
  ],
  low_light: [
    "speakeasy","jazz lounge","cocktail lounge",
    "wine bar nightlife","intimate cocktail bar","candlelit bar",
    "upscale lounge","hookah lounge","rooftop lounge nightlife",
    "craft cocktail bar","whiskey bar",
  ],
  soul_food: [
    "soul food restaurant","southern comfort food restaurant",
    "black owned restaurant","soul food brunch","soul food late night",
    "black owned brunch","african american restaurant",
  ],
  caribbean: [
    "caribbean restaurant","jamaican restaurant","haitian restaurant",
    "trinidadian restaurant","caribbean fusion restaurant",
    "rum bar restaurant","caribbean brunch","jerk chicken restaurant",
  ],
  italian: [
    "italian restaurant","italian trattoria","italian fine dining",
    "italian wine bar","neapolitan pizza","italian pasta restaurant",
  ],
  mexican: [
    "mexican restaurant","taqueria","mezcal bar restaurant",
    "authentic mexican restaurant","birria restaurant","mexican brunch",
  ],
  latin_american: [
    "peruvian restaurant","colombian restaurant","brazilian restaurant",
    "venezuelan restaurant","argentinian steakhouse",
    "dominican restaurant","puerto rican restaurant","cuban restaurant",
  ],
  indian: [
    "indian restaurant","indian fine dining","indian lounge",
    "modern indian restaurant","biryani restaurant","tandoori restaurant",
  ],
  korean: [
    "korean bbq restaurant","korean restaurant","soju bar",
    "kpop bar","korean fried chicken",
  ],
  thai: [
    "thai restaurant","thai street food","modern thai restaurant",
    "thai noodle restaurant",
  ],
  japanese: [
    "japanese restaurant","sushi restaurant","ramen restaurant",
    "izakaya","omakase restaurant",
  ],
  chinese: [
    "chinese restaurant","dim sum restaurant","cantonese restaurant",
    "sichuan restaurant","dumpling restaurant",
  ],
  seafood: [
    "oyster bar","seafood restaurant","lobster restaurant","crab house",
  ],
  mediterranean: [
    "mediterranean restaurant","greek restaurant","turkish restaurant",
    "lebanese restaurant","falafel restaurant",
  ],
  american: [
    "new american restaurant","american fine dining","american gastropub",
    "american brunch restaurant",
  ],
  fusion: [
    "fusion restaurant","modern fusion restaurant",
    "chef driven restaurant","asian fusion restaurant",
  ],
  steakhouse: [
    "steakhouse","steakhouse fine dining","brazilian steakhouse",
  ],
};

function photoUrl(ref) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${GOOGLE_API_KEY}`;
}

async function textSearch(query) {
  const res = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
    params: { query, key: GOOGLE_API_KEY }
  });
  return res.data.results || [];
}

async function getPlaceDetails(placeId) {
  const res = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
    params: {
      place_id: placeId, key: GOOGLE_API_KEY,
      fields: 'name,formatted_address,formatted_phone_number,website,url,opening_hours,price_level,rating,user_ratings_total,reviews,photos,types,business_status,geometry,editorial_summary,serves_beer,serves_wine,serves_brunch,serves_dinner,dine_in,takeout,delivery,reservable',
    }
  });
  return res.data.result || null;
}

async function runScrape() {
  console.log('LUMINA GOOGLE SCRAPER — FINAL (Quality Gates v2)\n');
  console.log('Gates: 4.2+ stars | 100+ reviews | 5+ photos | website required | no chains/trucks/carts\n');

  // Load all already-scraped IDs
  const seenIds = new Set();
  for (const f of ['scrape_manhattan.json','scrape_brooklyn.json','scrape_queens.json']) {
    try {
      const data = JSON.parse(fs.readFileSync(`/opt/viberyte/lumina-web/data/${f}`, 'utf8'));
      data.forEach(v => seenIds.add(v.google_place_id));
      console.log(`Loaded ${data.length} from ${f}`);
    } catch(e) {}
  }

  // Load existing DB IDs
  let existingIds = new Set();
  try {
    const rows = execSync(`sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT google_place_id FROM venues WHERE google_place_id IS NOT NULL AND google_place_id != '';"`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    existingIds = new Set(rows);
    console.log(`DB has ${existingIds.size} venues`);
  } catch (e) {}

  console.log(`Deduping against ${seenIds.size} already-scraped\n`);

  let allVenues = [];
  let searchCalls = 0, detailCalls = 0;
  let skipped = { low_rating: 0, low_reviews: 0, closed: 0, existing: 0, not_worthy: 0 };

  for (const city of CITIES) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  CITY: ${city.query}`);
    console.log(`${'='.repeat(50)}`);

    for (const [world, queries] of Object.entries(WORLD_QUERIES)) {
      console.log(`\n  🌍 ${world.toUpperCase()}`);

      for (const q of queries) {
        const full = `${q} ${city.query}`;
        process.stdout.write(`    🔎 "${full}" `);

        let places = [];
        try { places = await textSearch(full); searchCalls++; }
        catch (e) { console.log('❌ ERROR'); continue; }

        let added = 0;
        for (const p of places) {
          if (seenIds.has(p.place_id)) continue;
          seenIds.add(p.place_id);

          if (p.business_status && p.business_status !== 'OPERATIONAL') { skipped.closed++; continue; }
          if ((p.rating || 0) < MIN_RATING) { skipped.low_rating++; continue; }
          if ((p.user_ratings_total || 0) < MIN_REVIEWS) { skipped.low_reviews++; continue; }
          if (existingIds.has(p.place_id)) { skipped.existing++; continue; }

          // Get details for quality check
          let details = null;
          try {
            details = await getPlaceDetails(p.place_id);
            detailCalls++;
            await new Promise(r => setTimeout(r, DETAIL_DELAY));
          } catch (e) { continue; }

          // QUALITY GATE
          const check = isLuminaWorthy(p, details);
          if (!check.pass) {
            skipped.not_worthy++;
            continue;
          }

          // PASSED ALL GATES — this is a Lumina venue
          let photos = [], hours = null, reviews = [], services = {};
          if (details) {
            if (details.photos) photos = details.photos.slice(0, MAX_PHOTOS).map(ph => ({ url: photoUrl(ph.photo_reference), ref: ph.photo_reference, w: ph.width, h: ph.height }));
            if (details.opening_hours) hours = { weekday_text: details.opening_hours.weekday_text || [] };
            if (details.reviews) reviews = details.reviews.slice(0, 3).map(r => ({ rating: r.rating, text: r.text, time: r.relative_time_description }));
            services = { dine_in: details.dine_in || false, takeout: details.takeout || false, delivery: details.delivery || false, reservable: details.reservable || false, brunch: details.serves_brunch || false, dinner: details.serves_dinner || false, beer: details.serves_beer || false, wine: details.serves_wine || false };
          }

          console.log(`\n      ✅ ${p.name} (${p.rating}⭐ ${p.user_ratings_total} reviews | ${photos.length} photos)`);

          allVenues.push({
            name: p.name, address: details?.formatted_address || p.formatted_address || null, city: city.key,
            google_place_id: p.place_id, rating: p.rating, reviews_count: p.user_ratings_total || 0,
            price_level: p.price_level ?? null,
            lat: p.geometry?.location?.lat || null, lng: p.geometry?.location?.lng || null,
            google_types: p.types || [],
            phone: details?.formatted_phone_number || null,
            website: details?.website || null,
            google_url: details?.url || null,
            editorial_summary: details?.editorial_summary?.overview || null,
            photos, photo_count: photos.length, hours, top_reviews: reviews, services,
            world_hint: world, source_query: q, source: 'google_places_v2',
            scraped_at: new Date().toISOString(),
          });
          added++;
        }
        if (added === 0) process.stdout.write('(0)\n');
        else console.log(`    → +${added}`);
        await new Promise(r => setTimeout(r, SEARCH_DELAY));
      }
    }

    // Save per-city
    const cityVenues = allVenues.filter(v => v.city === city.key);
    fs.writeFileSync(`/opt/viberyte/lumina-web/data/scrape_${city.key}.json`, JSON.stringify(cityVenues, null, 2));
    console.log(`\n  💾 ${city.key}: ${cityVenues.length} Lumina-quality venues saved`);

    // Update master
    let master = [];
    for (const f of ['scrape_manhattan.json','scrape_brooklyn.json','scrape_queens.json']) {
      try { master = master.concat(JSON.parse(fs.readFileSync(`/opt/viberyte/lumina-web/data/${f}`, 'utf8'))); } catch(e) {}
    }
    master = master.concat(allVenues);
    fs.writeFileSync('/opt/viberyte/lumina-web/data/google_scrape_results.json', JSON.stringify(master, null, 2));
    console.log(`  📊 Master total: ${master.length}`);
  }

  const cost = (searchCalls * 0.032) + (detailCalls * 0.017);
  console.log(`\n${'='.repeat(50)}`);
  console.log('  SCRAPE COMPLETE');
  console.log(`${'='.repeat(50)}`);
  console.log(`New venues: ${allVenues.length}`);
  console.log(`API calls: ${searchCalls} searches + ${detailCalls} details`);
  console.log(`Cost: ~$${cost.toFixed(2)}`);
  console.log(`\nSkipped:`);
  console.log(`  ${skipped.low_rating} low rating | ${skipped.low_reviews} low reviews`);
  console.log(`  ${skipped.closed} closed | ${skipped.existing} already in DB`);
  console.log(`  ${skipped.not_worthy} failed quality gate`);

  const wc = {};
  allVenues.forEach(v => wc[v.world_hint] = (wc[v.world_hint] || 0) + 1);
  console.log('\nBy world:');
  Object.entries(wc).sort((a,b) => b[1]-a[1]).forEach(([w,c]) => console.log(`  ${w}: ${c}`));
}

runScrape().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
