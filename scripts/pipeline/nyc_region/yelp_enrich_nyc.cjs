const fs = require("fs");
const path = require("path");
const axios = require("axios");

require("dotenv").config({ path: "/opt/viberyte/lumina-web/.env" });

const YELP_KEY = process.env.YELP_API_KEY;
if (!YELP_KEY) {
  console.error("❌ ERROR: YELP_API_KEY missing");
  process.exit(1);
}

const INPUT_FILE = path.join(__dirname, "nyc_region_final.json");
const OUTPUT_FILE = path.join(__dirname, "nyc_region_with_yelp.json");

console.log("🔵 Loading:", INPUT_FILE);
const venues = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
console.log(`🔍 Yelp enrichment for ${venues.length} venues\n`);

const yelpClient = axios.create({
  baseURL: "https://api.yelp.com/v3",
  headers: { Authorization: `Bearer ${YELP_KEY}` }
});

// TERM-ONLY SEARCH (BEST FOR UNIQUE NIGHTLIFE VENUES)
async function searchYelp(name) {
  const attempts = [
    name,
    `${name} NYC`,
    `${name} New York`,
  ];

  for (const term of attempts) {
    try {
      const res = await yelpClient.get("/businesses/search", {
        params: { term, limit: 3 }
      });
      if (res.data.businesses?.length > 0) {
        return res.data.businesses[0];
      }
    } catch (err) {}
  }

  return null;
}

async function run() {
  let out = [];

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    const name = v.venueName;

    console.log(`➡️ [${i + 1}/${venues.length}] Searching: ${name}`);

    let y = null;
    try {
      y = await searchYelp(name);
    } catch (err) {}

    if (y) {
      console.log(`   ✔ Match: ${y.name}`);
      v.yelp = {
        id: y.id,
        alias: y.alias,
        name: y.name,
        rating: y.rating,
        review_count: y.review_count,
        price: y.price || null,
        url: y.url,
        phone: y.display_phone,
        categories: y.categories?.map(c => c.title) || [],
        photos: y.photos || [],
        location: y.location || {},
        coordinates: y.coordinates || {},
      };
    } else {
      console.log(`   ⚠️ No Yelp match`);
      v.yelp = null;
    }

    out.push(v);
    await new Promise(r => setTimeout(r, 450));
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2));
  console.log(`\n✅ DONE → ${OUTPUT_FILE}`);
}

run();
