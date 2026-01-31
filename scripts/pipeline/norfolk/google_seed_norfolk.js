import fs from "fs";
import axios from "axios";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing GOOGLE_PLACES_API_KEY");
  process.exit(1);
}

const CITY = "Norfolk VA";
const QUERY_KEYWORDS = [
  "night club",
  "club",
  "bar",
  "cocktail bar",
  "hookah lounge",
  "lounge",
  "rooftop bar",
  "speakeasy",
  "wine bar",
  "dance club",
  "live music venue",
  "restaurant",
  "italian restaurant",
  "french restaurant",
  "spanish restaurant",
  "mediterranean restaurant",
  "greek restaurant",
  "seafood restaurant",
  "steakhouse",
  "sushi restaurant",
  "japanese restaurant",
  "korean restaurant",
  "chinese restaurant",
  "thai restaurant",
  "vietnamese restaurant",
  "indian restaurant",
  "mexican restaurant",
  "latin american restaurant",
  "caribbean restaurant",
  "ethiopian restaurant",
  "middle eastern restaurant",
  "lebanese restaurant",
  "moroccan restaurant",
  "african restaurant",
  "southern restaurant",
  "soul food restaurant",
  "american restaurant",
  "burger restaurant",
  "brunch",
  "fine dining",
  "tapas bar",
  "ramen restaurant",
  "pho restaurant",
  "bbq restaurant",
  "vegetarian restaurant",
  "vegan restaurant",
  "bistro",
  "gastropub",
  "sports bar",
  "pub",
  "craft beer bar",
  "brewery",
  "distillery"
];

const OUTPUT_FILE = "google_seed_norfolk.json";

async function searchPlaces(keyword) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword + " " + CITY)}&key=${API_KEY}`;
    const response = await axios.get(url);
    return response.data.results || [];
  } catch (err) {
    console.error(`❌ Error searching ${keyword}:`, err.message);
    return [];
  }
}

async function getPlaceDetails(placeId) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${API_KEY}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,types,photos,geometry,opening_hours`;
    const response = await axios.get(url);
    return response.data.result;
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log(`🔍 SCRAPING NORFOLK VENUES`);
  
  const allPlaces = new Map();
  
  for (const keyword of QUERY_KEYWORDS) {
    console.log(`\n📍 Searching: ${keyword}`);
    const places = await searchPlaces(keyword);
    console.log(`  Found ${places.length} results`);
    
    for (const place of places) {
      if (!allPlaces.has(place.place_id)) {
        allPlaces.set(place.place_id, place);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📦 Total unique venues: ${allPlaces.size}`);
  console.log(`🔍 Fetching detailed info...`);
  
  const detailedVenues = [];
  let count = 0;
  
  for (const [placeId, place] of allPlaces) {
    count++;
    console.log(`→ Fetching details (${count}/${allPlaces.size}): ${place.name}`);
    
    const details = await getPlaceDetails(placeId);
    if (details) {
      detailedVenues.push({
        venueName: details.name,
        address: details.formatted_address,
        phone: details.formatted_phone_number || null,
        website: details.website || null,
        rating: details.rating || null,
        totalReviews: details.user_ratings_total || 0,
        priceLevel: details.price_level || null,
        types: details.types || [],
        placeId: placeId,
        latitude: details.geometry?.location?.lat || null,
        longitude: details.geometry?.location?.lng || null,
        photos: details.photos?.map(p => p.photo_reference) || [],
        hours: details.opening_hours?.weekday_text || []
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`✅ Final venues: ${detailedVenues.length}`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(detailedVenues, null, 2));
  console.log(`💾 Saved to ${OUTPUT_FILE}`);
}

run().catch(console.error);
