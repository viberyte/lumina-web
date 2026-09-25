const Database = require('better-sqlite3');
const https = require('https');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'lumina.db');
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const SEARCHES = [
  // Lower East Side
  { query: 'cocktail bar Lower East Side NYC', neighborhood: 'Lower East Side', borough: 'Manhattan', category: 'cocktail_lounge' },
  { query: 'restaurant Lower East Side NYC', neighborhood: 'Lower East Side', borough: 'Manhattan', category: 'restaurant' },
  { query: 'nightclub Lower East Side NYC', neighborhood: 'Lower East Side', borough: 'Manhattan', category: 'nightclub' },
  // East Village
  { query: 'cocktail lounge East Village NYC', neighborhood: 'East Village', borough: 'Manhattan', category: 'cocktail_lounge' },
  { query: 'restaurant East Village NYC', neighborhood: 'East Village', borough: 'Manhattan', category: 'restaurant' },
  { query: 'speakeasy East Village NYC', neighborhood: 'East Village', borough: 'Manhattan', category: 'speakeasy' },
  { query: 'live music East Village NYC', neighborhood: 'East Village', borough: 'Manhattan', category: 'live_music' },
  // West Village
  { query: 'cocktail bar West Village NYC', neighborhood: 'West Village', borough: 'Manhattan', category: 'cocktail_lounge' },
  { query: 'restaurant West Village NYC', neighborhood: 'West Village', borough: 'Manhattan', category: 'restaurant' },
  { query: 'jazz club West Village NYC', neighborhood: 'West Village', borough: 'Manhattan', category: 'jazz_club' },
  // SoHo / Nolita
  { query: 'upscale restaurant SoHo NYC', neighborhood: 'SoHo', borough: 'Manhattan', category: 'restaurant' },
  { query: 'rooftop bar SoHo NYC', neighborhood: 'SoHo', borough: 'Manhattan', category: 'rooftop_bar' },
  { query: 'cocktail lounge Nolita NYC', neighborhood: 'Nolita', borough: 'Manhattan', category: 'cocktail_lounge' },
  // Chelsea / Meatpacking
  { query: 'nightclub Meatpacking District NYC', neighborhood: 'Meatpacking', borough: 'Manhattan', category: 'nightclub' },
  { query: 'rooftop bar Chelsea NYC', neighborhood: 'Chelsea', borough: 'Manhattan', category: 'rooftop_bar' },
  { query: 'restaurant Chelsea NYC', neighborhood: 'Chelsea', borough: 'Manhattan', category: 'restaurant' },
  // Flatiron / NoMad
  { query: 'cocktail lounge Flatiron NYC', neighborhood: 'Flatiron', borough: 'Manhattan', category: 'cocktail_lounge' },
  { query: 'upscale restaurant NoMad NYC', neighborhood: 'NoMad', borough: 'Manhattan', category: 'restaurant' },
  // Midtown
  { query: 'rooftop bar Midtown Manhattan', neighborhood: 'Midtown', borough: 'Manhattan', category: 'rooftop_bar' },
  { query: 'steakhouse Midtown Manhattan', neighborhood: 'Midtown', borough: 'Manhattan', category: 'restaurant' },
  { query: 'lounge Midtown Manhattan', neighborhood: 'Midtown', borough: 'Manhattan', category: 'lounge' },
  // Hell's Kitchen
  { query: 'restaurant Hell\'s Kitchen NYC', neighborhood: "Hell's Kitchen", borough: 'Manhattan', category: 'restaurant' },
  { query: 'cocktail bar Hell\'s Kitchen NYC', neighborhood: "Hell's Kitchen", borough: 'Manhattan', category: 'cocktail_lounge' },
  // Harlem
  { query: 'soul food restaurant Harlem NYC', neighborhood: 'Harlem', borough: 'Manhattan', category: 'restaurant' },
  { query: 'jazz club Harlem NYC', neighborhood: 'Harlem', borough: 'Manhattan', category: 'jazz_club' },
  { query: 'lounge Harlem NYC', neighborhood: 'Harlem', borough: 'Manhattan', category: 'lounge' },
  // Williamsburg
  { query: 'nightclub Williamsburg Brooklyn', neighborhood: 'Williamsburg', borough: 'Brooklyn', category: 'nightclub' },
  { query: 'rooftop bar Williamsburg Brooklyn', neighborhood: 'Williamsburg', borough: 'Brooklyn', category: 'rooftop_bar' },
  { query: 'restaurant Williamsburg Brooklyn', neighborhood: 'Williamsburg', borough: 'Brooklyn', category: 'restaurant' },
  // Greenpoint
  { query: 'cocktail bar Greenpoint Brooklyn', neighborhood: 'Greenpoint', borough: 'Brooklyn', category: 'cocktail_lounge' },
  { query: 'restaurant Greenpoint Brooklyn', neighborhood: 'Greenpoint', borough: 'Brooklyn', category: 'restaurant' },
  // DUMBO
  { query: 'restaurant DUMBO Brooklyn', neighborhood: 'DUMBO', borough: 'Brooklyn', category: 'restaurant' },
  { query: 'rooftop bar DUMBO Brooklyn', neighborhood: 'DUMBO', borough: 'Brooklyn', category: 'rooftop_bar' },
  // Bushwick
  { query: 'nightclub Bushwick Brooklyn', neighborhood: 'Bushwick', borough: 'Brooklyn', category: 'nightclub' },
  { query: 'bar Bushwick Brooklyn', neighborhood: 'Bushwick', borough: 'Brooklyn', category: 'bar' },
  // Late night citywide
  { query: 'late night bar Manhattan NYC', neighborhood: null, borough: 'Manhattan', category: 'late_night' },
  { query: 'after hours club Manhattan NYC', neighborhood: null, borough: 'Manhattan', category: 'nightclub' },
  // Date night
  { query: 'romantic restaurant Manhattan NYC', neighborhood: null, borough: 'Manhattan', category: 'restaurant', subcategory: 'date_night' },
  // Dessert / Coffee
  { query: 'dessert bar Manhattan NYC', neighborhood: null, borough: 'Manhattan', category: 'dessert' },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function searchPlaces(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encoded}&key=${API_KEY}`;
  return fetch(url);
}

async function getDetails(placeId) {
  const fields = 'name,formatted_address,formatted_phone_number,website,geometry,rating,user_ratings_total,price_level,editorial_summary';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`;
  return fetch(url);
}

function priceToRange(level) {
  if (!level) return null;
  return ['$', '$$', '$$$', '$$$$'][level - 1] || null;
}

async function main() {
  const db = new Database(DB_PATH);
  
  try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_google_place ON venues(google_place_id)'); } catch(e) {}

  const insert = db.prepare(`
    INSERT OR IGNORE INTO venues (
      name, address, city, state, latitude, longitude, phone, website,
      category, subcategory, price_range, description, google_place_id, google_rating,
      google_review_count, neighborhood, borough, region, is_certified, is_active, bougie_level
    ) VALUES (
      @name, @address, @city, @state, @latitude, @longitude, @phone, @website,
      @category, @subcategory, @price_range, @description, @google_place_id, @google_rating,
      @google_review_count, @neighborhood, @borough, @region, 0, 1, 3
    )
  `);

  let total = 0;
  let inserted = 0;

  for (const search of SEARCHES) {
    console.log(`\n🔍 ${search.query}`);
    try {
      const results = await searchPlaces(search.query);
      if (!results.results) { console.log('  No results'); continue; }
      console.log(`  Found ${results.results.length} places`);

      for (const place of results.results) {
        total++;
        try {
          const details = await getDetails(place.place_id);
          const d = details.result || {};

          const venue = {
            name: d.name || place.name,
            address: d.formatted_address || place.formatted_address,
            city: 'New York',
            state: 'NY',
            latitude: d.geometry?.location?.lat || place.geometry?.location?.lat || null,
            longitude: d.geometry?.location?.lng || place.geometry?.location?.lng || null,
            phone: d.formatted_phone_number || null,
            website: d.website || null,
            category: search.category,
            subcategory: search.subcategory || null,
            price_range: priceToRange(d.price_level || place.price_level),
            description: d.editorial_summary?.overview || null,
            google_place_id: place.place_id,
            google_rating: d.rating || place.rating || null,
            google_review_count: d.user_ratings_total || place.user_ratings_total || null,
            neighborhood: search.neighborhood || null,
            borough: search.borough,
            region: 'nyc',
          };

          const result = insert.run(venue);
          if (result.changes > 0) {
            inserted++;
            console.log(`  ✓ ${venue.name} — ${venue.neighborhood || venue.borough}`);
          } else {
            console.log(`  - ${venue.name} (dup)`);
          }
          await new Promise(r => setTimeout(r, 100));
        } catch(e) {
          console.log(`  ✗ ${place.name}: ${e.message}`);
        }
      }
    } catch(e) {
      console.log(`  Error: ${e.message}`);
    }
  }

  console.log(`\n=============================`);
  console.log(`Total found: ${total}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`=============================`);

  const count = db.prepare('SELECT COUNT(*) as c FROM venues').get();
  console.log(`Total venues in DB: ${count.c}`);

  const byCat = db.prepare('SELECT category, COUNT(*) as c FROM venues GROUP BY category ORDER BY c DESC').all();
  console.log('\nBy category:');
  byCat.forEach(r => console.log(`  ${r.category}: ${r.c}`));

  const byHood = db.prepare('SELECT neighborhood, COUNT(*) as c FROM venues WHERE neighborhood IS NOT NULL GROUP BY neighborhood ORDER BY c DESC').all();
  console.log('\nBy neighborhood:');
  byHood.forEach(r => console.log(`  ${r.neighborhood}: ${r.c}`));

  db.close();
}

main().catch(console.error);
