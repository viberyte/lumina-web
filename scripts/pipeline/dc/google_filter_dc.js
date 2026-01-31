import fs from "fs";

const INPUT_FILE = "google_seed_dc.json";
const OUTPUT_FILE = "google_filtered_dc.json";

function loadFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error("❌ Failed to load:", file, err);
    process.exit(1);
  }
}

const CHAIN_KEYWORDS = [
  "mcdonald",
  "burger king",
  "wendy",
  "7-eleven",
  "taco bell",
  "shell",
  "chevron",
  "subway",
  "chick-fil-a",
  "popeyes",
  "starbucks",
  "dunkin"
];

const BAD_TYPES = [
  "gym",
  "school",
  "park",
  "pharmacy",
  "grocery",
  "supermarket",
  "real_estate",
  "hair",
  "nail",
  "gas_station",
  "lodging",
  "hotel",
  "spa",
  "warehouse",
  "store",
  "shopping"
];

function run() {
  console.log("🔍 Loading Google seed file…");
  const data = loadFile(INPUT_FILE);
  console.log("📦 Total items:", data.length);

  const clean = data.filter(item => {
    const name = item.venueName?.toLowerCase() || "";
    const types = item.types || [];
    const rating = item.rating || 0;
    const reviews = item.totalReviews || 0;

    // Remove chains
    if (CHAIN_KEYWORDS.some(c => name.includes(c))) {
      return false;
    }

    // Remove bad types
    if (types.some(t => BAD_TYPES.includes(t))) {
      return false;
    }

    // Keep high-quality places (looser filter)
    if (rating >= 3.5 && reviews >= 30) {
      return true;
    }

    // Keep if has photos (means it's a real venue)
    if (item.photos && item.photos.length > 0) {
      return true;
    }

    return false;
  });

  // Dedupe by venue name
  const deduped = Object.values(
    clean.reduce((acc, item) => {
      const key = item.venueName.trim().toLowerCase();
      if (!acc[key]) acc[key] = item;
      return acc;
    }, {})
  );

  console.log("✨ Final filtered count:", deduped.length);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deduped, null, 2));
  console.log("✔ Saved →", OUTPUT_FILE);
}

run();
