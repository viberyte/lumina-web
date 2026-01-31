/**
 * OPTIMIZED Google Places Seed — NYC + North Jersey
 *
 * Collects:
 *   - Nightclubs, lounges, hookah, rooftops, speakeasies
 *   - Aesthetic restaurants, upscale dining, brunch, supper clubs
 *
 * Filters (light):
 *   - rating >= 3.5 (Google)
 *   - reviews >= 20 (optional)
 *
 * Output:
 *   google_seed_nyc_region.json
 */

import fs from "fs";
import fetch from "node-fetch";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error("❌ GOOGLE_PLACES_API_KEY not set.");
  process.exit(1);
}

const SEARCH_AREAS = [
  "Manhattan, NY",
  "Brooklyn, NY",
  "Queens, NY",
  "Bronx, NY",
  "Staten Island, NY",
  "Jersey City, NJ",
  "Hoboken, NJ",
  "Weehawken, NJ",
  "Edgewater, NJ",
  "North Bergen, NJ",
  "Newark, NJ",
  "Montclair, NJ",
];

// NIGHTLIFE + VIBE DINING keywords
const KEYWORDS = [
  "nightclub",
  "club",
  "bar",
  "lounge",
  "hookah lounge",
  "rooftop bar",
  "speakeasy",
  "cocktail lounge",
  "dance club",
  "after-hours",

  "aesthetic restaurant",
  "fine dining",
  "upscale restaurant",
  "romantic restaurant",
  "brunch restaurant",
  "supper club",
  "trendy restaurant",
];

async function searchPlaces(query, location) {
  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=` +
    encodeURIComponent(`${query} in ${location}`) +
    `&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();
  return data?.results || [];
}

function passesSeedFilter(v) {
  const r = v.rating || 0;
  const n = v.user_ratings_total || 0;

  // Soft filters (C-level strategy)
  if (r < 3.5) return false;
  if (n < 20) return false;

  return true;
}

async function run() {
  const results = [];

  console.log("🔥 Optimized NYC + NJ Google seed starting…");

  for (const area of SEARCH_AREAS) {
    for (const keyword of KEYWORDS) {
      console.log(`🔍 Searching: "${keyword}" in ${area}`);

      const found = await searchPlaces(keyword, area);

      for (const v of found) {
        if (!passesSeedFilter(v)) continue;

        results.push({
          venueName: v.name,
          googleId: v.place_id,
          address: v.formatted_address || "",
          rating: v.rating || null,
          reviews: v.user_ratings_total || null,
          location: v.geometry?.location || null,
          sourceKeyword: keyword,
          searchArea: area,
        });
      }
    }
  }

  console.log(`✨ NYC Region Seed Complete: ${results.length} venues`);
  fs.writeFileSync("google_seed_nyc_region.json", JSON.stringify(results, null, 2));
  console.log("✔ Saved → google_seed_nyc_region.json");
}

run();
