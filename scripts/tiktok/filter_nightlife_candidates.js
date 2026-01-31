import fs from "fs";

// Keywords that indicate nightlife
const nightlifeKeywords = [
  "bar", "lounge", "club", "hookah", "restaurant", "rooftop",
  "nightlife", "venue", "vip", "bottle", "dj", "party",
  "after dark", "late night", "happy hour", "dance", "event",
  "turn up", "philly nightlife", "night out", "girls night",
  "date night", "upscale", "cocktail", "spot", "speakeasy"
];

// Keywords that indicate NON-nightlife
const rejectKeywords = [
  "abandoned", "urbex", "graffiti", "rooftop access", "decaying", "lost city",
  "explore", "urbextok", "stillwater", "infiltration", "broken", "ruins",
  "school", "church", "factory", "warehouse", "run down",
  "train station", "bus stop", "museum"
];

function isNightlifeItem(item) {
  const caption = (item.caption || "").toLowerCase();
  const hashtags = (item.hashtags || []).join(" ").toLowerCase();

  const text = caption + " " + hashtags;

  // Reject if clearly not nightlife
  if (rejectKeywords.some(k => text.includes(k))) return false;

  // Accept if nightlife is obvious
  if (nightlifeKeywords.some(k => text.includes(k))) return true;

  // If we have a venue name, accept it
  if (item.venueName) return true;

  return false;
}

function filterFile(inFile, outFile) {
  const data = JSON.parse(fs.readFileSync(inFile, "utf8"));
  const filtered = data.filter(isNightlifeItem);

  fs.writeFileSync(outFile, JSON.stringify(filtered, null, 2));
  console.log(`✔ Filtered ${data.length} → ${filtered.length}: ${outFile}`);
}

filterFile("venue_candidates.json", "venue_filtered.json");
filterFile("event_candidates.json", "event_filtered.json");
