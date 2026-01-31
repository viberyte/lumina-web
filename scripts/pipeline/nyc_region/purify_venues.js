/**
 * Final Purifier for NYC Region
 * Input: google_seed_nyc_region_classified.json
 * Output: nyc_region_final.json
 */

import fs from "fs";

const INPUT = "google_seed_nyc_region_classified.json";
const OUTPUT = "nyc_region_final.json";

const ALLOWED_TYPES = new Set([
  "Bar",
  "Lounge",
  "Nightclub",
  "Rooftop",
  "Speakeasy",
  "Restaurant / Dining",
  "Event Space"
]);

function isValid(v) {
  if (!v.venueName) return false;

  const type = (v.venueType || "").trim();
  if (!ALLOWED_TYPES.has(type)) return false;

  // remove weird or broken names
  const name = v.venueName.toLowerCase();
  if (name.includes("laundromat")) return false;
  if (name.includes("laundry")) return false;
  if (name.includes("gas station")) return false;
  if (name.includes("church")) return false;
  if (name.includes("school")) return false;
  if (name.includes("library")) return false;
  if (name.includes("playground")) return false;

  return true;
}

function dedupe(venues) {
  const seen = new Set();
  const out = [];

  for (const v of venues) {
    const key = v.venueName.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }

  return out;
}

function run() {
  if (!fs.existsSync(INPUT)) {
    console.error(`❌ Missing ${INPUT}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  console.log("Loaded:", raw.length);

  const filtered = raw.filter(isValid);
  console.log("After type filtering:", filtered.length);

  const deduped = dedupe(filtered);
  console.log("After dedupe:", deduped.length);

  fs.writeFileSync(OUTPUT, JSON.stringify(deduped, null, 2));
  console.log(`✔ Saved → ${OUTPUT}`);
}

run();
