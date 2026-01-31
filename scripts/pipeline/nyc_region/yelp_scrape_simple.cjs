const fs = require("fs");
const path = require("path");
const axios = require("axios");

require("dotenv").config({ path: "/opt/viberyte/lumina-web/.env" });

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
if (!APIFY_TOKEN) {
    console.error("❌ ERROR: Missing APIFY_API_TOKEN in .env");
    process.exit(1);
}

const ACTOR = "epctex~yelp-scraper";

const INPUT_FILE = path.join(__dirname, "nyc_region_final.json");
const OUTPUT_FILE = path.join(__dirname, "nyc_region_with_yelp.json");

const venues = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
console.log("🔵 Loaded venues:", venues.length);

// Apify client
const apifyClient = axios.create({
    baseURL: "https://api.apify.com/v2",
    timeout: 120000,
});

// Scrape Yelp using run-sync endpoint
async function scrapeYelp(name) {
    try {
        const response = await apifyClient.post(
            `/acts/${ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
            {
                search: name,
                searchLocation: "New York, NY",
                maxItems: 1,
                includeReviews: true,
                includePhotos: true,
                proxy: { useApifyProxy: true }
            }
        );

        return response.data[0] || null;

    } catch (err) {
        console.log("❌ Yelp scrape error:", err.response?.data || err.message);
        return null;
    }
}

async function run() {
    const enriched = [];

    for (let i = 0; i < venues.length; i++) {
        const v = venues[i];
        const venueName = v.venueName;

        console.log(`➡️ [${i + 1}/${venues.length}] Scraping Yelp for: ${venueName}`);

        const yelp = await scrapeYelp(venueName);

        if (yelp) {
            console.log(`   ✔ Yelp match found: ${yelp.name || venueName}`);

            v.yelp = {
                name: yelp.name || null,
                rating: yelp.rating || null,
                review_count: yelp.reviewCount || null,
                price: yelp.price || null,
                categories: yelp.categories || [],
                photos: yelp.photos || [],
                website: yelp.website || null,
                url: yelp.url || null,
                address: yelp.address || null,
                reviews: yelp.reviews || []
            };
        } else {
            console.log(`   ⚠️ No Yelp data`);
            v.yelp = null;
        }

        enriched.push(v);

        await new Promise(r => setTimeout(r, 700)); // prevent rate-limit
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
    console.log(`\n✅ Yelp scraping complete → ${OUTPUT_FILE}`);
}

run();
