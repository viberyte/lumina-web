import fs from "fs";

// Remove results that are NOT real venue names
function isRealVenue(v) {
  if (!v || !v.venueName) return false;

  const invalidNames = [
    "philadelphia",
    "philly",
    "nightlife",
    "downtown",
    "city",
    "center city",
    "university city"
  ];

  const name = v.venueName.toLowerCase().trim();

  // Remove generic names like "Philadelphia"
  if (invalidNames.includes(name)) return false;

  // Remove names that are too generic
  if (name.length < 3) return false;

  // Remove names that contain no proper nouns
  if (!/[A-Z]/.test(v.venueName[0])) return false;

  return true;
}

function purify(inFile, outFile) {
  const data = JSON.parse(fs.readFileSync(inFile, "utf8"));

  const cleaned = data.filter(isRealVenue);

  fs.writeFileSync(outFile, JSON.stringify(cleaned, null, 2));
  console.log(`✔ Purified: ${cleaned.length} real venues`);
}

purify("venue_classified.json", "venue_purified.json");
