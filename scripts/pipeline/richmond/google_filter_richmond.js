import fs from "fs";

const INPUT_FILE = "google_seed_richmond.json";
const OUTPUT_FILE = "google_filtered_richmond.json";

const CHAIN_KEYWORDS = [
  "mcdonald", "burger king", "wendy", "7-eleven", "taco bell",
  "shell", "chevron", "subway", "chick-fil-a", "popeyes", 
  "starbucks", "dunkin"
];

const BAD_TYPES = [
  "gym", "school", "park", "pharmacy", "grocery", "supermarket",
  "real_estate", "hair", "nail", "gas_station", "lodging", 
  "hotel", "spa", "warehouse", "store", "shopping"
];

const CLOSED_KEYWORDS = [
  "permanently closed", "closed permanently", "out of business",
  "temporarily closed", "closed down"
];

function run() {
  console.log("🔍 Filtering Richmond venues...");
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  console.log("📦 Total items:", data.length);

  const clean = data.filter(item => {
    const name = item.venueName?.toLowerCase() || "";
    const types = item.types || [];
    const rating = item.rating || 0;
    const reviews = item.totalReviews || 0;

    if (CHAIN_KEYWORDS.some(c => name.includes(c))) return false;
    if (CLOSED_KEYWORDS.some(k => name.includes(k))) return false;
    if (types.some(t => BAD_TYPES.includes(t))) return false;
    if (rating < 3.8 || reviews < 50) return false;
    if (!item.photos || item.photos.length === 0) return false;

    return true;
  });

  const deduped = Object.values(
    clean.reduce((acc, item) => {
      const key = item.venueName.trim().toLowerCase();
      if (!acc[key]) acc[key] = item;
      return acc;
    }, {})
  );

  console.log("✨ Filtered:", deduped.length);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deduped, null, 2));
  console.log("✔ Saved →", OUTPUT_FILE);
  process.exit(0); // STOP HERE
}

run();
