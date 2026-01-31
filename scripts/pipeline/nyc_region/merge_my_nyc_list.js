/**
 * Merge curated NYC venues from lumina.db with final_nyc_region.json
 *
 * Input:
 *   - /opt/viberyte/lumina-web/data/lumina.db (SQLite)
 *   - final_nyc_region.json
 *
 * Output:
 *   - final_nyc_region_merged.json
 */

import fs from "fs";
import Database from "better-sqlite3";

const DB_PATH = "/opt/viberyte/lumina-web/data/lumina.db";
const FINAL_INPUT = "final_nyc_region.json";
const OUTPUT = "final_nyc_region_merged.json";

// Load NYC region final dataset
if (!fs.existsSync(FINAL_INPUT)) {
  console.error("❌ Missing final_nyc_region.json. Run NYC pipeline first.");
  process.exit(1);
}

const nycFinal = JSON.parse(fs.readFileSync(FINAL_INPUT, "utf8"));
console.log(`🔥 NYC Final Count: ${nycFinal.length}`);

// Connect to SQLite DB
if (!fs.existsSync(DB_PATH)) {
  console.error("❌ lumina.db not found.");
  process.exit(1);
}

const db = new Database(DB_PATH);
console.log("🗂 Connected to lumina.db");

// Load curated NYC venues from these tables
const TABLES = [
  "venues",
  "clean_venues",
  "clean_nj_venues",
  "venues_staging",
  "staging_venues"
];

function loadTable(name) {
  try {
    const rows = db.prepare(`SELECT * FROM ${name}`).all();
    console.log(`Loaded ${rows.length} from ${name}`);
    return rows;
  } catch {
    console.log(`Skipping missing table: ${name}`);
    return [];
  }
}

let curated = [];
for (const tbl of TABLES) {
  curated = curated.concat(loadTable(tbl));
}

console.log(`🔥 Total curated venue entries loaded: ${curated.length}`);

// Normalize keys
function normalizeName(name) {
  return name ? name.trim().toLowerCase() : "";
}

// Build index for NYC final dataset
const nycIndex = {};
for (const v of nycFinal) {
  const key = normalizeName(v.venueName);
  nycIndex[key] = v;
}

// Merge curated venues
for (const c of curated) {
  const key = normalizeName(c.name || c.venueName);

  if (!key) continue;

  if (!nycIndex[key]) {
    // Add curated venue to NYC dataset
    nycFinal.push({
      venueName: c.name || c.venueName,
      venueType: c.venueType || c.type || "",
      address: c.address || "",
      neighborhood: c.neighborhood || "",
      source: "curated_db",
      imported: true,

      // Empty AI fields — will be enriched later
      ai: {},
      ai_ig: {},
      ai_yelp: {},
      vision: {}
    });
  }
}

// Remove duplicates by name
const
seen = new Set();
const merged = [];

for (const v of nycFinal) {
  const key = normalizeName(v.venueName);
  if (!seen.has(key)) {
    seen.add(key);
    merged.push(v);
  }
}

console.log(`✨ NYC + Curated Combined: ${merged.length} venues`);

fs.writeFileSync(OUTPUT, JSON.stringify(merged, null, 2));
console.log(`✔ Saved → ${OUTPUT}`);
