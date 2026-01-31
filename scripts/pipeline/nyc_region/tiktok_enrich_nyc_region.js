/**
 * TikTok Enrichment — NYC + North Jersey
 *
 * Input:
 *   google_filtered_nyc_region.json
 *
 * Output:
 *   tiktok_enriched_nyc_region.json
 *
 * This script:
 *   - queries TikTok for each venue
 *   - extracts captions, hashtags, audio, vibes
 *   - runs LLM classification to pull:
 *       vibes, music, dress_code, crowd, energy, trend score, etc.
 */

import fs from "fs";
import fetch from "node-fetch";

const INPUT = "google_filtered_nyc_region.json";
const OUTPUT = "tiktok_enriched_nyc_region.json";

if (!fs.existsSync(INPUT)) {
  console.error("❌ google_filtered_nyc_region.json not found.");
  process.exit(1);
}

const venues = JSON.parse(fs.readFileSync(INPUT, "utf8"));

console.log(`🔥 TikTok Enrichment for NYC Region: ${venues.length} venues`);

// Use your existing TikTok Apify endpoint
const API_ENDPOINT = process.env.TIKTOK_API || "http://localhost:5005/tiktok";

async function enrichVenue(venue) {
  const name = venue.venueName;

  const cities = [
    "NYC",
    "New York",
    "Manhattan",
    "Brooklyn",
    "Queens",
    "Bronx",
    "Staten Island",
    "Jersey City",
    "Hoboken",
    "Weehawken",
    "Edgewater",
    "Newark",
    "Montclair"
  ];

  const queries = cities.map(c => `${name} ${c}`);

  console.log(`🔍 TikTok → ${name}`);

  try {
    const res = await fetch(`${API_ENDPOINT}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries })
    });

    const data = await res.json();

    return {
      ...venue,
      tiktok: data.videos || [],
      ai: data.ai || {}
    };
  } catch (e) {
    console.error("❌ TikTok error:", name, e.message);
    return venue; // fallback
  }
}

async function run() {
  const enriched = [];

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];

    console.log(`Progress: ${i + 1}/${venues.length}`);

    const result = await enrichVenue(v);
    enriched.push(result);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(enriched, null, 2));
  console.log(`✔ Saved → ${OUTPUT}`);
}

run();
