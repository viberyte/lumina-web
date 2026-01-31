/**
 * Merge & Finalize DC Dataset
 *
 * Input files:
 *  - google_filtered_dc.json
 *  - tiktok_enriched_dc.json
 *  - instagram_enriched_dc.json
 *  - yelp_enriched_dc.json
 *  - vision_enriched_dc.json
 *  - venue_final_dc.json
 *
 * Output:
 *  final_dc.json
 *
 * This is the FINAL dataset used by Lumina Mobile
 */

import fs from "fs";

// Try to load each file if available
function tryLoad(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {}
  return null;
}

const sources = {
  google: tryLoad("google_filtered_dc.json"),
  tiktok: tryLoad("tiktok_enriched_dc.json"),
  instagram: tryLoad("instagram_enriched_dc.json"),
  yelp: tryLoad("yelp_enriched_dc.json"),
  vision: tryLoad("vision_enriched_dc.json"),
  final: tryLoad("venue_final_dc.json"),
};

if (!sources.final) {
  console.error("❌ Missing venue_final_dc.json — run poppin filter first.");
  process.exit(1);
}

// -------------------------------------
// Helper: merge objects safely
// -------------------------------------

function mergeObjects(...objs) {
  const out = {};
  for (const o of objs) {
    if (!o) continue;
    for (const [k, v] of Object.entries(o)) {
      if (v !== null && v !== undefined) {
        out[k] = v;
      }
    }
  }
  return out;
}

// -------------------------------------
// Build indexed maps for fast merging
// -------------------------------------

function indexByName(arr) {
  if (!arr) return {};
  const map = {};
  for (const v of arr) {
    const key = v.venueName?.trim().toLowerCase();
    if (key) map[key] = v;
  }
  return map;
}

const tik = indexByName(sources.tiktok);
const ig = indexByName(sources.instagram);
const yelp = indexByName(sources.yelp);
const vision = indexByName(sources.vision);

// -------------------------------------
// FINAL MERGE
// -------------------------------------

const finalOut = [];

console.log(`🔥 Merging intelligence layers for ${sources.final.length} DC venues…`);

for (const venue of sources.final) {
  const key = venue.venueName.trim().toLowerCase();

  const merged = mergeObjects(
    venue,
    tik[key],
    ig[key],
    yelp[key],
    vision[key]
  );

  // Standard final schema fields
  merged.final = {
    venueName: merged.venueName || "",
    venueType: merged.venueType || "",
    vibes: merged.ai?.vibes || [],
    musicGenres: merged.ai?.musicGenres || [],
    dressCode: merged.ai?.dressCode || "",
    crowdType: merged.ai?.crowdType || "",
    priceTier: merged.ai_yelp?.priceTier || merged.priceTier || "",
    trendScore: merged.ai?.trendScore || 0,
    aestheticScore: merged.vision?.aestheticScore || 0,
    luxuryScore: merged.vision?.luxuryScore || 0,
    tiktokabilityScore: merged.vision?.tiktokabilityScore || 0,
    bestNights: merged.ai?.bestNights || merged.ai_ig?.bestNights || [],
    eventTypes: merged.ai_ig?.eventTypes || [],
    summary: merged.ai?.summary || merged.ai_ig?.summary || "",
  };

  finalOut.push(merged);
}

// Sort by heat score
finalOut.sort(
  (a, b) =>
    (b.final.trendScore + b.final.aestheticScore) -
    (a.final.trendScore + a.final.aestheticScore)
);

fs.writeFileSync("final_dc.json", JSON.stringify(finalOut, null, 2));

console.log("✔ DC dataset ready → final_dc.json");
