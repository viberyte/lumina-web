/**
 * POPPIN FILTER — NYC + North Jersey
 *
 * Input sources (use whichever exists):
 *  - vision_enriched_nyc_region.json
 *  - yelp_enriched_nyc_region.json
 *  - instagram_enriched_nyc_region.json
 *  - tiktok_enriched_nyc_region.json
 *  - google_filtered_nyc_region.json
 *
 * Output:
 *  - venue_final_nyc_region.json
 *
 * Determines if a venue is "Lumina-worthy"
 */

import fs from "fs";

const SOURCE_FILES = [
  "vision_enriched_nyc_region.json",
  "yelp_enriched_nyc_region.json",
  "instagram_enriched_nyc_region.json",
  "tiktok_enriched_nyc_region.json",
  "google_filtered_nyc_region.json"
];

let INPUT = null;

// Pick the most enriched file available
for (const file of SOURCE_FILES) {
  if (fs.existsSync(file)) {
    INPUT = file;
    break;
  }
}

if (!INPUT) {
  console.error("❌ No enriched input found.");
  process.exit(1);
}

const OUTPUT = "venue_final_nyc_region.json";

console.log(`🔥 POPPIN FILTER using: ${INPUT}`);

const venues = JSON.parse(fs.readFileSync(INPUT, "utf8"));

console.log(`Loaded: ${venues.length} NYC venues`);

function computeScore(v) {
  const google = v.rating || 0;
  const reviewCount = v.reviews || 0;

  const yelpSent = v.ai_yelp?.sentimentScore || 0;
  const yelpPrice = v.yelp?.price?.length || 1;

  const tiktokTrend = v.ai?.trendScore || 0;
  const igTrend = v.ai_ig?.trendScoreIG || 0;

  const aesthetic = v.vision?.aestheticScore || 0;
  const luxury = v.vision?.luxuryScore || 0;
  const tiktokability = v.vision?.tikTokabilityScore || 0;

  const tiktokVolume = v.tiktok ? Math.min(v.tiktok.length / 5, 10) : 0;
  const igVolume = v.instagram?.length ? Math.min(v.instagram.length / 5, 10) : 0;

  const multiplier =
    (reviewCount > 400 ? 1.1 : 1) *
    (aesthetic > 7 ? 1.3 : 1) *
    (tiktokability > 6 ? 1.2 : 1);

  const score =
    (
      google * 0.8 +
      yelpSent * 0.7 +
      tiktokTrend * 1.2 +
      igTrend * 0.7 +
      aesthetic * 1.4 +
      luxury * 0.5 +
      tiktokability * 1.0 +
      tiktokVolume * 1.0 +
      igVolume * 0.9 +
      yelpPrice * 0.4
    ) * multiplier;

  return Math.round(score * 10) / 10;
}

function isPoppin(v) {
  const score = computeScore(v);

  // Hard filters
  if (v.rating && v.rating < 3.9) return false;
  if (v.reviews && v.reviews < 35) return false;

  if ((v.vision?.aestheticScore || 0) < 4) return false;
  if ((v.ai?.trendScore || 0) < 2) return false;

  const name = v.venueName?.toLowerCase() || "";

  const nightlifeKeywords = [
    "bar",
    "club",
    "night",
    "lounge",
    "rooftop",
    "hookah",
    "speakeasy",
    "after dark",
    "party",
    "day party",
    "brunch",
    "taproom",
    "brew pub"
  ];

  const isNightlife = nightlifeKeywords.some(k => name.includes(k));

  const goodRestaurant =
    (v.rating >= 4.4) &&
    (v.reviews >= 250) &&
    (v.vision?.aestheticScore >= 7);

  if (!isNightlife && !goodRestaurant) return false;

  v.finalScore = score;
  return true;
}

// Process
const final = [];

console.log("🔎 Applying poppin filter…");

for (const v of venues) {
  if (isPoppin(v)) final.push(v);
}

final.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

console.log(`✨ FINAL NYC POPPIN VENUES: ${final.length} / ${venues.length}`);
fs.writeFileSync(OUTPUT, JSON.stringify(final, null, 2));

console.log(`✔ Saved → ${OUTPUT}`);
