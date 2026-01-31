const axios = require("axios");
const fs = require("fs");
require("dotenv").config({ path: "/opt/viberyte/lumina-web/.env" });

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = "V8SFJw3gKgULelpok";

// load queries.txt → array
const queriesFile = "/opt/viberyte/lumina-web/scripts/pipeline/nyc_region/ig_queries.txt";
const queries = fs.readFileSync(queriesFile, "utf8")
  .split("\n")
  .map(q => q.trim())
  .filter(q => q.length > 0);

console.log("🔵 Loaded IG search queries:", queries.length);

(async () => {
    try {
        console.log("🚀 Starting Google SERP scraping…");

        const input = {
            queries: queries,
            maxItems: 20,
            endPage: 1,
            includeUnfilteredResults: false,
            includePeopleAlsoAsk: false,
            proxy: { useApifyProxy: true }
        };

        // run actor and fetch dataset directly
        const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
        const res = await axios.post(url, input, { timeout: 1800000 });

        fs.writeFileSync("ig_google_results.json", JSON.stringify(res.data, null, 2));

        console.log("✅ Saved → ig_google_results.json");

    } catch (err) {
        console.error("❌ SERP scraping failed:", err.response?.data || err.message);
    }
})();
