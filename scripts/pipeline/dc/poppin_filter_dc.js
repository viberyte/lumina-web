/**
 * Final Poppin Filter for Washington DC
 * Combines:
 * - Google rating
 * - Yelp sentiment
 * - TikTok trend score
 * - Instagram activity
 * - OpenAI vision aesthetic score
 * - AI vibe classification
 *
 * Output: venue_final_dc.json
 */

import fs from "fs";
import path from "path";

const INPUT_FILES = [
  "vision_enriched_dc.json",
  "yelp_enriched_dc.json",
  "instagram_enriched_dc.json",
  "tiktok_enriched_dc.json",
  "google_filtered_dc.json"
];

let INPUT_FILE = null;

// -----------------------------------------
// Pick the most enriched file available
// -----------------------------------------
for (const f of INPUT_FILES) {
  if (fs.existsSync(f)) {
    INPUT_FILE = f;
    break;
  }
}

if (!INPUT_FILE) {
  console.error("❌ No DC enriched files found.");
  process.exit(1);
}

console.log(`🔍 Using ${INPUT_FILE} for final poppin filter…`);

const OUTPUT_FILE = "venue_final_dc.json";

// -----------------------------------------
// Compute combined score
// -----------------------------------------

function computeScore(v) {
  const g = v.rating || 0;
  const yelpSent = v.ai_yelp?.sentimentScore || 0;
  const tiktokTrend = v.ai?.trendScore || 0;
  const igTrend = v.ai_ig?.trendScoreIG || 0;
  const aesthetic = v.vision?.aestheticScore || 0;
  const luxury = v.vision?.luxuryScore || 0;

  // TikTok/IG volume scores
  const tiktokVolume = v.tiktok ? Math.min(v.tiktok.length / 5, 10) : 0;
  const igVolume = v.instagram?.posts ? Math.min(v.instagram.posts.length / 5, 10) : 0;

  // Weighted formula (can adjust based on real-world data)
  const score =
    g * 0.8 +
    yelpSent * 0.7 +
    tiktokTrend * 1.2 +
    igTrend * 0.8 +
    aesthetic * 1.5 +
    luxury * 0.5 +
    tiktokVolume * 1.0 +
    igVolume * 0.8;

  return Math.round(score * 10) / 10;
}

// -----------------------------------------
// Determine if a venue is Lumina-Worthy
// -----------------------------------------

function isPoppin(v) {
  const score = computeScore(v);

  // Hard filters
  if (v.rating && v.rating < 3.9) return false;
  if (v.reviews && v.reviews < 40) return false;

  // Aesthetic minimum
  if ((v.vision?.aestheticScore || 0) < 4) return false;

  // Trend minimum
  if ((v.ai?.trendScore || 0) < 3) return false;

  // Category check
  const name = v.venueName?.toLowerCase() || "";

  const nightlifeKeywords = [
    "lounge",
    "club",
    "night",
    "bar",
    "taproom",
    "speakeasy",
    "rooftop",
    "hookah",
    "after-hours",
    "day party",
    "brunch"
  ];

  const isNightlife = nightlifeKeywords.some(k => name.includes(k));

  // Keep nightlife OR truly aesthetic restaurants
  if (!isNightlife) {
    const isGoodRestaurant =
      (v.rating >= 4.4) &&
      (v.reviews >= 200) &&
      (v.vision?.aestheticScore >= 7);

    if (!isGoodRestaurant) return false;
  }

  v.finalScore = score;
  return true;
}

// -----------------------------------------
// MAIN
// -----------------------------------------

function run() {
  const venues = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const final = [];

  console.log(`🔥 Computing poppin scores for ${venues.length} venues…`);

  for (const v of venues) {
    if (isPoppin(v)) final.push(v);
  }

  // Sort descending by finalScore
  final.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

  console.log(`✨ Final poppin venues: ${final.length} / ${venues.length}`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(final, null, 2));
  console.log(`✔ Saved → ${OUTPUT_FILE}`);
}

run();
