import fs from "fs";

const nightlifeKeywords = [
  "bar","Bar","BAR",
  "club","Club","CLUB",
  "nightclub","Nightclub","NightClub","NIGHTCLUB",
  "lounge","Lounge","LOUNGE",
  "hookah","Hookah","HOOKAH",
  "rooftop","Rooftop","RoofTop",
  "restaurant","Restaurant","RESTAURANT",
  "pub","Pub","PUB",
  "speakeasy","Speakeasy",
  "cocktail","Cocktail",
  "music venue","Music Venue","music","Music",
  "event space","Event Space"
];

function isNightlife(item) {
  if (!item || !item.venueType) return false;
  const type = item.venueType.toLowerCase();
  return nightlifeKeywords.some(k => type.includes(k.toLowerCase()));
}

const data = JSON.parse(fs.readFileSync("venue_classified.json","utf8"));
const filtered = data.filter(isNightlife);

console.log("Original:", data.length);
console.log("Nightlife only:", filtered.length);

fs.writeFileSync("venue_nightlife.json", JSON.stringify(filtered,null,2));
console.log("✔ Saved → venue_nightlife.json");
