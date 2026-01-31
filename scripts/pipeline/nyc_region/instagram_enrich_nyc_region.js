/**
 * Instagram Enrichment — NYC + North Jersey
 *
 * Input:
 *   google_filtered_nyc_region.json
 *
 * Output:
 *   instagram_enriched_nyc_region.json
 *
 * This script:
 *   - fetches Instagram posts for each venue
 *   - extracts flyers, events, captions, tags
 *   - sends media/captions to OpenAI for vibe/event classification
 */

import fs from "fs";
import fetch from "node-fetch";

const INPUT = "google_filtered_nyc_region.json";
const OUTPUT = "instagram_enriched_nyc_region.json";

if (!fs.existsSync(INPUT)) {
  console.error("❌ google_filtered_nyc_region.json not found.");
  process.exit(1);
}

const venues = JSON.parse(fs.readFileSync(INPUT, "utf8"));

console.log(`🔥 Instagram Enrichment for NYC Region: ${venues.length} venues`);

const IG_API = process.env.IG_SCRAPER_URL || "http://localhost:5006/ig";

async function enrichVenue(v) {
  console.log(`📸 IG → ${v.venueName}`);

  try {
    const res = await fetch(`${IG_API}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venue: v.venueName,
        address: v.address,
        city: "NYC / North Jersey",
        limit: 20
      })
    });

    const data = await res.json();

    return {
      ...v,
      instagram: data.instagram || [],
      ai_ig: data.ai || {}
    };
  } catch (err) {
    console.error(`❌ IG error for ${v.venueName}:`, err.message);
    return v;
  }
}

async function run() {
  const enriched = [];

  for (let i = 0; i < venues.length; i++) {
    console.log(`Progress: ${i + 1}/${venues.length}`);
    enriched.push(await enrichVenue(venues[i]));
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(enriched, null, 2));
  console.log(`✔ Saved → ${OUTPUT}`);
}

run();
