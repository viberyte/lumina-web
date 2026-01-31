/**
 * MERGE & FINALIZE — NYC + North Jersey
 *
 * Input files (whichever exist):
 *  - poppin_filter_nyc_region.json
 *  - vision_enriched_nyc_region.json
 *  - yelp_enriched_nyc_region.json
 *  - instagram_enriched_nyc_region.json
 *  - tiktok_enriched_nyc_region.json
 *  - google_filtered_nyc_region.json
 *
 * Output:
 *   final_nyc_region.json
 *
 * This is the master dataset used by Lumina Mobile.
 */

import fs from "fs";

const INPUT_FILES = [
  "poppin_filter_nyc_region.json",
  "vision_enriched_nyc_region.json",
  "yelp_enriched_nyc_region.json",
  "instagram_enriched_nyc_region.json",
  "tiktok_enriched_nyc_region.json",
  "google_filtered_nyc_region.json"
];

let INPUT = null;

for (const f of INPUT_FILES) {
  if (fs.existsSync(f)) {
    INPUT = f;
    break;
  }
}

if (!INPUT) {
  console.error("❌ No NYC enrichment files found.");
  process.exit(1);
}

console.log(`🔥 Using ${INPUT} as base for merging…`);

const base = JSON.parse(fs.readFileSync(INPUT, "utf8"));

function indexByName(arr) {
  if (!arr) return {};
  const map = {};
  for (const v of arr) {
    const key = v.venueName?.trim().toLowerCase();
    if (key) map[key] = v;
  }
  return map;
}

const google = fs.existsSync("google_filtered_nyc_region.json")
  ? indexByName(JSON.parse(fs.readFileSync("google_filtered_nyc_region.json"))) 
  : {};

const tiktok = fs.existsSync("tiktok_enriched_nyc_region.json")
  ? indexByName(JSON.parse(fs.readFileSync("tiktok_enriched_nyc_region.json"))) 
  : {};

const instagram = fs.existsSync("instagram_enriched_nyc_region.json")
  ? indexByName(JSON.parse(fs.readFileSync("instagram_enriched_nyc_region.json"))) 
  : {};

const yelp = fs.existsSync("yelp_enriched_nyc_region.json")
  ? indexByName(JSON.parse(fs.readFileSync("yelp_enriched_nyc_region.json"))) 
  : {};

const vision = fs.existsSync("vision_enriched_nyc_region.json")
  ? indexByName(JSON.parse(fs.readFileSync("vision_enriched_nyc_region.json"))) 
  : {};

const out = [];

function mergeObjects(...objects) {
  const merged = {};
  for (const obj of objects) {
    if (!obj) continue;
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && v !== undefined) merged[k] = v;
    }
  }
  return merged;
}

console.log(`Merging intelligence layers for ${base.length} venues…`);

for (const v of base) {
  const key = v.venueName?.trim().toLowerCase();

  const merged = mergeObjects(
    v,
    google[key],
    tiktok[key],
    instagram[key],
    yelp[key],
    vision[key]
  );

  // Standardized final schema
  merged.final = {
    venueName: merged.venueName || "",
    venueType: merged.venueType || "",
    vibes: merged.ai?.vibes || [],
    musicGenres: merged.ai?.musicGenres || [],
    dressCode: merged.ai?.dressCode || "",
    neighborhood: merged.neighborhood || merged.ai?.neighborhood || "",
    priceTier: merged.yelp?.price || merged.ai_yelp?.priceTier || "",
    crowdType: merged.ai?.crowdType || "",
    trendScore: merged.ai?.trendScore || 0,
    aestheticScore: merged.vision?.aestheticScore || 0,
    luxuryScore: merged.vision?.luxuryScore || 0,
    tiktokabilityScore: merged.vision?.tikTokabilityScore || 0,
    bestNights: merged.ai_ig?.bestNights || [],
    eventTypes: merged.ai_ig?.eventTypes || [],
    summary: merged.ai?.summary || merged.ai_ig?.summary || "",
    finalScore: merged.finalScore || 0
  };

  out.push(merged);
}

out.sort(
  (a, b) =>
    (b.final.finalScore + b.final.trendScore + b.final.aestheticScore) -
    (a.final.finalScore + a.final.trendScore + a.final.aestheticScore)
);

fs.writeFileSync("final_nyc_region.json", JSON.stringify(out, null, 2));

console.log("✔ NYC Region Final Dataset Saved → final_nyc_region.json");
