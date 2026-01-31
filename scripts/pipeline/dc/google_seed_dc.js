import fs from "fs";
import axios from "axios";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing GOOGLE_PLACES_API_KEY");
  process.exit(1);
}

const CITY = "Washington DC";
const QUERY_KEYWORDS = [
  // Nightlife
  "night club",
  "club",
  "bar",
  "cocktail bar",
  "hookah lounge",
  "lounge",
  "rooftop bar",
  "speakeasy",
  "live music",
  
  // General Dining
  "restaurant",
  "fine dining",
  "upscale restaurant",
  "trendy restaurant",
  
  // Cuisines
  "italian restaurant",
  "sushi restaurant",
  "japanese restaurant",
  "steakhouse",
  "soul food restaurant",
  "caribbean restaurant",
  "african restaurant",
  "ethiopian restaurant",
  "latin restaurant",
  "mexican restaurant",
  "mediterranean restaurant",
  "middle eastern restaurant",
  "chinese restaurant",
  "thai restaurant",
  "indian restaurant",
  "french restaurant",
  "american restaurant",
  "seafood restaurant",
];

async function googleSearch(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query + " in " + CITY
  )}&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    return response.data.results || [];
  } catch (err) {
    console.error("❌ Google Places Error:", err.message);
    return [];
  }
}

async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    return response.data.result || null;
  } catch (err) {
    console.error("❌ Details Error:", err.message);
    return null;
  }
}

async function run() {
  let rawResults = [];

  console.log("🔍 Starting COMPREHENSIVE Google Places discovery for DC…");
  console.log(`📋 Searching ${QUERY_KEYWORDS.length} keywords...`);

  for (const keyword of QUERY_KEYWORDS) {
    console.log(`→ Searching for: ${keyword}`);
    const results = await googleSearch(keyword);

    for (const place of results) {
      rawResults.push({
        place_id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        coordinates: place.geometry?.location || {},
        rating: place.rating || null,
        reviews: place.user_ratings_total || 0,
        types: place.types || [],
      });
    }
  }

  console.log(`📌 Initial results: ${rawResults.length}`);

  const deduped = Object.values(
    rawResults.reduce((acc, item) => {
      acc[item.place_id] = item;
      return acc;
    }, {})
  );

  console.log(`🧹 After dedupe: ${deduped.length}`);

  const finalData = [];

  for (let i = 0; i < deduped.length; i++) {
    const place = deduped[i];
    console.log(`→ Fetching details (${i + 1}/${deduped.length}): ${place.name}`);

    const details = await getPlaceDetails(place.place_id);

    if (!details) continue;

    finalData.push({
      venueName: details.name,
      address: details.formatted_address || "",
      neighborhood: details.vicinity || "",
      rating: details.rating || null,
      totalReviews: details.user_ratings_total || 0,
      priceLevel: details.price_level || null,
      phone: details.formatted_phone_number || "",
      website: details.website || "",
      googleMapsUrl: details.url || "",
      photos: details.photos?.map(p => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${API_KEY}`) || [],
      coordinates: {
        lat: details.geometry?.location?.lat || null,
        lng: details.geometry?.location?.lng || null,
      },
      placeId: details.place_id,
      types: details.types || [],
      openingHours: details.opening_hours?.weekday_text || [],
    });
  }

  console.log(`✅ Final venues: ${finalData.length}`);

  fs.writeFileSync("google_seed_dc.json", JSON.stringify(finalData, null, 2));
  console.log("💾 Saved to google_seed_dc.json");
}

run().catch(console.error);
