/**
 * GOOGLE FILTER — NYC + North Jersey
 *
 * Input:
 *   google_seed_nyc_region.json
 *
 * Output:
 *   google_filtered_nyc_region.json
 *
 * Removes:
 *  - chains / fast food
 *  - delis / bodegas
 *  - breakfast spots
 *  - family restaurants
 *  - irrelevant dining
 *  - low-aesthetic spots
 *  - low rating OR low review count
 *
 * Keeps:
 *  - aesthetic restaurants
 *  - rooftops
 *  - speakeasies
 *  - lounges
 *  - nightclubs
 *  - bars
 *  - supper clubs
 *  - brunch spots
 *  - vibe-forward dining
 */

import fs from "fs";

const INPUT = "google_seed_nyc_region.json";
const OUTPUT = "google_filtered_nyc_region.json";

if (!fs.existsSync(INPUT)) {
  console.error("❌ google_seed_nyc_region.json not found.");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(INPUT, "utf8"));

console.log(`🔥 Loaded NYC Raw: ${raw.length} venues`);

// Keywords indicating low-quality / irrelevant venues
const TRASH_KEYWORDS = [
  "deli",
  "bodega",
  "pharmacy",
  "mcDonalds",
  "mcdonald",
  "domino",
  "papa john",
  "wendys",
  "kfc",
  "burger king",
  "7-eleven",
  "7 eleven",
  "grocery",
  "liquor store",
  "fast food",
  "gas station",
  "taco bell",
  "subway",
  "dunkin",
  "dunkin donuts",
  "starbucks"
];

// Restaurants that are NOT vibe-forward
const BORING_RESTAURANTS = [
  "pizza",
  "diner",
  "bagel",
  "breakfast",
  "sandwich",
  "coffee",
  "coffee shop",
  "burrito",
  "shawarma",
  "noodle",
  "ramen",
  "takeout",
  "to go",
  "family restaurant"
];

// Minimum quality thresholds
const MIN_RATING = 3.8;
const MIN_REVIEWS = 40;

// Allowed categories
const NIGHTLIFE_KEYWORDS = [
  "bar",
  "club",
  "night",
  "nightclub",
  "lounge",
  "rooftop",
  "hookah",
  "speakeasy",
  "cocktail",
  "taproom",
  "brewery",
  "brew pub",
  "live music",
  "music venue",
  "dance"
];

const AESTHETIC_DINING_KEYWORDS = [
  "fine dining",
  "upscale",
  "luxury",
  "restaurant",
  "brunch",
  "romantic",
  "beautiful",
  "aesthetic",
  "supper club",
  "modern",
  "trending"
];

function isTrash(v) {
  const name = v.venueName?.toLowerCase() || "";
  const address = v.address?.toLowerCase() || "";

  return (
    TRASH_KEYWORDS.some(k => name.includes(k)) ||
    BORING_RESTAURANTS.some(k => name.includes(k)) ||
    TRASH_KEYWORDS.some(k => address.includes(k))
  );
}

function isHighQuality(v) {
  if (!v.rating || v.rating < MIN_RATING) return false;
  if (!v.reviews || v.reviews < MIN_REVIEWS) return false;
  return true;
}

function isNightlifeOrAesthetic(v) {
  const name = v.venueName?.toLowerCase() || "";
  const category = v.category?.toLowerCase() || "";

  const good =
    NIGHTLIFE_KEYWORDS.some(k => name.includes(k)) ||
    NIGHTLIFE_KEYWORDS.some(k => category.includes(k)) ||
    AESTHETIC_DINING_KEYWORDS.some(k => name.includes(k));

  return good;
}

// FINAL FILTER
const filtered = [];

for (const v of raw) {
  if (isTrash(v)) continue;
  if (!isHighQuality(v)) continue;
  if (!isNightlifeOrAesthetic(v)) continue;

  filtered.push(v);
}

console.log(`✨ NYC Filtered (Lumina-worthy): ${filtered.length}`);

fs.writeFileSync(OUTPUT, JSON.stringify(filtered, null, 2));

console.log(`✔ Saved → ${OUTPUT}`);
