/**
 * FILTER + CLEAN Google Seed for NYC Region
 *
 * Input:
 *   google_seed_nyc_region.json
 *
 * Output:
 *   google_seed_nyc_region_filtered.json
 */

import fs from "fs";

const INPUT = "google_seed_nyc_region.json";
const OUTPUT = "google_seed_nyc_region_filtered.json";

// Allowed nightlife / dining categories for safety
const ALLOWED_KEYWORDS = [
  "nightclub",
  "club",
  "bar",
  "lounge",
  "hookah",
  "rooftop",
  "speakeasy",
  "cocktail",
  "dance",
  "after-hours",

  "restaurant",
  "dining",
  "aesthetic",
  "fine dining",
  "upscale",
  "romantic",
  "brunch",
  "supper",
  "trendy"
];

function isAllowed(v) {
  const name = (v.venueName || "").toLowerCase();
  const keyword = (v.sourceKeyword || "").toLowerCase();

  // Remove fame keywords like "public park", "market", etc.
  if (name.includes("park")) return false;
  if (name.includes("playground")) return false;
  if (name.includes("shopping")) return false;
  if (name.includes("mall")) return false;

  // Soft match for nightlife/dining keywords
  return ALLOWED_KEYWORDS.some(k => name.includes(k) || keyword.includes(k));
}

function ratingOK(v) {
  const r = v.rating || 0;
  const n = v.reviews || 0;

  if (r < 3.5) return false;
  if (n < 10) return false;

  return true;
}

function dedupe(arr) {
  const seen = new Set();
  const out = [];

  for (const v of arr) {
    const key = (v.venueName || "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }

  return out;
}

function run() {
  if (!fs.existsSync(INPUT)) {
    console.error(`❌ Input not found: ${INPUT}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  console.log("Loaded:", raw.length);

  const filtered = raw.filter(v => ratingOK(v) && isAllowed(v));
  console.log("After category + rating filter:", filtered.length);

  const deduped = dedupe(filtered);
  console.log("After dedupe:", deduped.length);

  fs.writeFileSync(OUTPUT, JSON.stringify(deduped, null, 2));
  console.log(`✔ Saved → ${OUTPUT}`);
}

run();

