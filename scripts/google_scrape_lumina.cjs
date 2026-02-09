const axios = require('axios');
const fs = require('fs');

const GOOGLE_API_KEY = 'AIzaSyDvMcJrFjAc_Wrb_FJzqVRWv_z00YB_j0k';
const MIN_REVIEWS = 50;
const MIN_RATING = 4.0;
const MAX_PHOTOS = 10;
const SEARCH_DELAY = 1200;
const DETAIL_DELAY = 300;

const CITIES = [
  { key: "manhattan", query: "Manhattan NYC" },
  { key: "brooklyn", query: "Brooklyn NYC" },
  { key: "queens", query: "Queens NYC" },
  { key: "bronx", query: "Bronx NYC" },
  { key: "harlem", query: "Harlem NYC" },
  { key: "long_island_city", query: "Long Island City NYC" },
  { key: "newark", query: "Newark NJ" },
  { key: "jersey_city", query: "Jersey City NJ" },
  { key: "hoboken", query: "Hoboken NJ" },
  { key: "philadelphia", query: "Philadelphia PA" },
];

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
    "soul food restaurant Harlem","soul food restaurant Brooklyn",
    "black owned brunch","african american restaurant","soul food food truck",
  ],
  caribbean: [
    "caribbean restaurant","jamaican restaurant","haitian restaurant",
    "trinidadian restaurant","caribbean fusion restaurant",
    "rum bar restaurant","caribbean bar with music",
    "caribbean brunch","caribbean food truck","jerk chicken restaurant",
  ],
  italian: [
    "italian restaurant","italian trattoria","italian fine dining",
    "italian wine bar","italian food truck","neapolitan pizza",
    "italian pasta restaurant",
  ],
  mexican: [
    "mexican restaurant","taqueria","mezcal bar restaurant",
    "mexican street food","mexican food truck",
    "authentic mexican restaurant","birria restaurant","mexican brunch",
  ],
  latin_american: [
    "peruvian restaurant","colombian restaurant","brazilian restaurant",
    "venezuelan restaurant","argentinian steakhouse",
    "dominican restaurant","puerto rican restaurant",
    "cuban restaurant","latin american food truck",
  ],
  indian: [
    "indian restaurant","indian fine dining","indian lounge",
    "modern indian restaurant","indian street food",
    "indian food truck","biryani restaurant","tandoori restaurant",
  ],
  korean: [
    "korean bbq restaurant","korean restaurant","soju bar",
    "kpop bar","korean fried chicken","korean food truck",
  ],
  thai: [
    "thai restaurant","thai street food","thai food truck",
    "modern thai restaurant","thai noodle restaurant",
  ],
  japanese: [
    "japanese restaurant","sushi restaurant","ramen restaurant",
    "izakaya","omakase restaurant","japanese food truck",
  ],
  chinese: [
    "chinese restaurant","dim sum restaurant","cantonese restaurant",
    "sichuan restaurant","chinese food truck","dumpling restaurant",
  ],
  seafood: [
    "oyster bar","seafood restaurant","lobster restaurant",
    "crab house","seafood food truck",
  ],
  mediterranean: [
    "mediterranean restaurant","greek restaurant","turkish restaurant",
    "lebanese restaurant","falafel restaurant","mediterranean food truck",
  ],
  american: [
    "new american restaurant","american fine dining","american gastropub",
    "american brunch restaurant","burger restaurant","american food truck",
  ],
  fusion: [
    "fusion restaurant","modern fusion restaurant",
    "chef driven restaurant","asian fusion restaurant",
  ],
  steakhouse: [
    "steakhouse","steakhouse fine dining","brazilian steakhouse",
  ],
};

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

function photoUrl(ref) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${GOOGLE_API_KEY}`;
}

async function runScrape() {
  console.log('LUMINA GOOGLE PLACES SCRAPER v2\n');
  const seenIds = new Set();
  const allVenues = [];
  let searchCalls = 0, detailCalls = 0, skippedLow = 0, skippedExist = 0, skippedClosed = 0;

  let existingIds = new Set();
  const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
  if (fs.existsSync(dbPath)) {
    try {
      const { execSync } = require('child_process');
      const rows = execSync(`sqlite3 ${dbPath} "SELECT google_place_id FROM venues WHERE google_place_id IS NOT NULL AND google_place_id != '';"`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
      existingIds = new Set(rows);
      console.log(`Found ${existingIds.size} existing venues in DB\n`);
    } catch (e) {}
  }

  for (const city of CITIES) {
    console.log(`\n=== CITY: ${city.query} ===`);
    for (const [world, queries] of Object.entries(WORLD_QUERIES)) {
      console.log(`\n  World: ${world}`);
      for (const q of queries) {
        const full = `${q} ${city.query}`;
        console.log(`    🔎 "${full}"`);
        let places = [];
        try { places = await textSearch(full); searchCalls++; }
        catch (e) { console.log('    ❌ ERROR'); continue; }

        let added = 0;
        for (const p of places) {
          if (seenIds.has(p.place_id)) continue;
          seenIds.add(p.place_id);
          if (p.business_status && p.business_status !== 'OPERATIONAL') { skippedClosed++; continue; }
          if ((p.rating || 0) < MIN_RATING || (p.user_ratings_total || 0) < MIN_REVIEWS) { skippedLow++; continue; }
          if (existingIds.has(p.place_id)) { skippedExist++; continue; }

          // LOG EVERY VENUE ADDED
          console.log(`      ✅ ${p.name} (${p.rating}⭐ ${p.user_ratings_total} reviews)`);

          let details = null, photos = [], hours = null, phone = null, website = null, gUrl = null, editorial = null, reviews = [], services = {};
          try {
            details = await getPlaceDetails(p.place_id);
            detailCalls++;
            if (details) {
              phone = details.formatted_phone_number || null;
              website = details.website || null;
              gUrl = details.url || null;
              editorial = details.editorial_summary?.overview || null;
              if (details.photos) photos = details.photos.slice(0, MAX_PHOTOS).map(ph => ({ url: photoUrl(ph.photo_reference), ref: ph.photo_reference, w: ph.width, h: ph.height }));
              if (details.opening_hours) hours = { weekday_text: details.opening_hours.weekday_text || [] };
              if (details.reviews) reviews = details.reviews.slice(0, 3).map(r => ({ rating: r.rating, text: r.text, time: r.relative_time_description }));
              services = { dine_in: details.dine_in || false, takeout: details.takeout || false, delivery: details.delivery || false, reservable: details.reservable || false, brunch: details.serves_brunch || false, dinner: details.serves_dinner || false, beer: details.serves_beer || false, wine: details.serves_wine || false };
            }
            await new Promise(r => setTimeout(r, DETAIL_DELAY));
          } catch (e) {}

          allVenues.push({
            name: p.name, address: p.formatted_address || null, city: city.key,
            google_place_id: p.place_id, rating: p.rating, reviews_count: p.user_ratings_total || 0,
            price_level: p.price_level ?? null,
            lat: p.geometry?.location?.lat || null, lng: p.geometry?.location?.lng || null,
            google_types: p.types || [], phone, website, google_url: gUrl, editorial_summary: editorial,
            photos, photo_count: photos.length, hours, top_reviews: reviews, services,
            world_hint: world, source_query: q, source: 'google_places_v2', scraped_at: new Date().toISOString(),
          });
          added++;
        }
        if (added === 0) console.log('      (no new venues)');
        await new Promise(r => setTimeout(r, SEARCH_DELAY));
      }
    }
    const cityVenues = allVenues.filter(v => v.city === city.key);
    fs.writeFileSync(`/opt/viberyte/lumina-web/data/scrape_${city.key}.json`, JSON.stringify(cityVenues, null, 2));
    console.log(`\n  💾 Saved ${cityVenues.length} for ${city.key}`);
  }

  const searchCost = searchCalls * 0.032;
  const detailCost = detailCalls * 0.017;
  const total = searchCost + detailCost;
  console.log(`\n========== DONE ==========`);
  console.log(`Venues: ${allVenues.length}`);
  console.log(`Searches: ${searchCalls} | Details: ${detailCalls}`);
  console.log(`Skipped: ${skippedLow} low quality | ${skippedExist} existing | ${skippedClosed} closed`);
  console.log(`Cost: ~$${total.toFixed(2)}`);

  const wc = {}; allVenues.forEach(v => wc[v.world_hint] = (wc[v.world_hint] || 0) + 1);
  console.log('\nBy world:'); Object.entries(wc).sort((a,b) => b[1]-a[1]).forEach(([w,c]) => console.log(`  ${w}: ${c}`));

  fs.writeFileSync('/opt/viberyte/lumina-web/data/google_scrape_results.json', JSON.stringify(allVenues, null, 2));
  console.log(`\nSaved: /opt/viberyte/lumina-web/data/google_scrape_results.json`);
}

runScrape().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
