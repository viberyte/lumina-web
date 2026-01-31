import fs from "fs";

const INPUT_FILE = "venue_clean_final.json";
const OUTPUT_FILE = "venue_final.json";

// Common junk patterns to delete
const BAD_NAMES = [
  "nightlife",
  "philadelphia nightlife",
  "philly nightlife",
  "philadelphia nightclub",
  "night club",
  "night out",
  "night"
];

function looksLikeUsername(name) {
  if (!name) return true;
  const low = name.toLowerCase().trim();

  // No spaces & alphabet soup — username
  if (!low.includes(" ") && low.length <= 10) return true;

  // Has numbers in name like "john123"
  if (/\d/.test(low) && !low.includes(" ")) return true;

  // TikTok style random letters
  if (/^[a-z]{4,12}$/i.test(low) && !low.includes(" ")) return true;

  return false;
}

function isGenericName(name) {
  const low = name.toLowerCase();
  return BAD_NAMES.some(bad => low.includes(bad));
}

function badNeighborhood(n) {
  if (!n) return true;
  const low = n.toLowerCase();

  // delete anything outside Philly (if it slipped in)
  const allowed = [
    "philadelphia",
    "center city",
    "fishtown",
    "south philly",
    "university city",
    "rittenhouse",
    "old city",
    "northern liberties",
    "manayunk"
  ];

  return !allowed.some(a => low.includes(a));
}

function isMissingCritical(v) {
  if (!v.vibes || v.vibes.length === 0) return true;
  if (!v.venueType) return true;
  if (!v.neighborhood) return true;
  if (!v.dressCode) return true;

  return false;
}

function obviouslyFake(v) {
  if (v.trendScore > 25 && v.venueName.length <= 12) return true;
  return false;
}

function cleanse(records) {
  return records.filter(v => {

    if (!v.venueName || v.venueName.trim() === "") return false;

    if (looksLikeUsername(v.venueName)) return false;

    if (isGenericName(v.venueName)) return false;

    if (badNeighborhood(v.neighborhood)) return false;

    if (isMissingCritical(v)) return false;

    if (obviouslyFake(v)) return false;

    return true; // keep
  });
}

function main() {
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  console.log(`Loaded ${data.length} entries`);

  const cleaned = cleanse(data);

  console.log(`After final cleansing: ${cleaned.length}`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleaned, null, 2));
  console.log(`✔ Saved → ${OUTPUT_FILE}`);
}

main();
