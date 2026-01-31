import fs from "fs";
import path from "path";
import stringSimilarity from "string-similarity";

//
// OFFICIAL VIBERYTE CATEGORIES
//
const CATEGORY_MAP = {
  "nightclub": "Nightclub",
  "club": "Nightclub",
  "dance club": "Nightclub",
  "bar/club": "Nightclub",
  "diner/club": "Nightclub",
  "gay club": "Nightclub",

  "bar": "Bar",
  "bar/restaurant": "Bar",
  "milkshake bar": "Bar",
  "ping pong bar": "Bar",
  "sports bar": "Sports Bar",
  "pub": "Pub / Tavern",

  "lounge": "Lounge",
  "cocktail lounge": "Lounge",
  "speakeasy": "Speakeasy",
  "hookah lounge": "Hookah Lounge",
  "karaoke bar": "Karaoke Lounge",

  "rooftop": "Rooftop",
  "rooftop bar": "Rooftop",
  "rooftop restaurant": "Rooftop",
  "hotel rooftop": "Rooftop",

  "restaurant": "Restaurant / Dining",
  "restaurant/bar": "Restaurant / Dining",
  "italian restaurant": "Restaurant / Dining",
  "oyster bar/restaurant": "Restaurant / Dining",

  "event space": "Event Space",
  "event venue": "Event Space",

  "live music venue": "Live Music Venue",
  "music venue": "Live Music Venue",

  "pool club": "Pool Club",
  "beach club": "Beach Club"
};

//
// NORMALIZATION HELPERS
//
function normalizeCategory(type = "") {
  const t = type.toLowerCase().trim();
  for (const key in CATEGORY_MAP) {
    if (t.includes(key)) return CATEGORY_MAP[key];
  }

  // if it's nightlife but not mapped, classify as "Bar" by default
  return "Bar";
}

function normalizePrice(price = "") {
  if (!price) return "$$";
  if (price.includes("$")) return price;
  if (price.toLowerCase().includes("moderate")) return "$$";
  if (price.toLowerCase().includes("high")) return "$$$";
  return "$$";
}

function normalizeDress(d = "") {
  if (!d) return "Casual";
  const x = d.toLowerCase();
  if (x.includes("smart")) return "Smart Casual";
  if (x.includes("chic")) return "Casual Chic";
  if (x.includes("formal")) return "Formal";
  return "Casual";
}

function normalizeNeighborhood(n = "") {
  if (!n) return "Philadelphia";
  return n
    .replace(/philadelphia county/gi, "Philadelphia")
    .replace(/philly/gi, "Philadelphia")
    .trim();
}

function normalizeVibes(vibes = []) {
  if (!Array.isArray(vibes)) return [];

  return [...new Set(
    vibes.map(v => v.trim())
         .filter(Boolean)
  )];
}

//
// DEDUPING LOGIC
//
function shouldMerge(a, b) {
  const nameA = a.venueName.toLowerCase();
  const nameB = b.venueName.toLowerCase();

  const sim = stringSimilarity.compareTwoStrings(nameA, nameB);

  // VERY IMPORTANT: adjust threshold to avoid over-merging
  return sim >= 0.78;
}

function chooseBestRecord(a, b) {
  // prefer the one with higher trendScore
  if ((b.trendScore || 0) > (a.trendScore || 0)) return b;

  // prefer record with more metadata fields filled
  const filledA = Object.values(a).filter(v => v).length;
  const filledB = Object.values(b).filter(v => v).length;

  if (filledB > filledA) return b;

  return a;
}

//
// MAIN SCRIPT
//
async function main() {
  const file = "venue_nightlife.json";
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log(`Loaded nightlife venues: ${raw.length}`);

  // 1. Normalize all entries
  const normalized = raw.map(v => ({
    ...v,
    venueName: (v.venueName || "").trim(),
    venueType: normalizeCategory(v.venueType),
    vibes: normalizeVibes(v.vibes),
    priceTier: normalizePrice(v.priceTier),
    dressCode: normalizeDress(v.dressCode),
    neighborhood: normalizeNeighborhood(v.neighborhood),
    trendScore: v.trendScore ? Number(v.trendScore) : 0
  }));

  // 2. Deduplicate using fuzzy matching
  const final = [];
  const used = new Set();

  for (let i = 0; i < normalized.length; i++) {
    if (used.has(i)) continue;

    let current = normalized[i];

    for (let j = i + 1; j < normalized.length; j++) {
      if (used.has(j)) continue;

      if (shouldMerge(current, normalized[j])) {
        current = chooseBestRecord(current, normalized[j]);
        used.add(j);
      }
    }

    final.push(current);
  }

  console.log(`After dedupe: ${final.length}`);

  fs.writeFileSync("venue_clean_final.json", JSON.stringify(final, null, 2));
  console.log(`✔ Saved → venue_clean_final.json`);
}

main();
