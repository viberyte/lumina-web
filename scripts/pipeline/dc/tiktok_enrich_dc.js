/**
 * TikTok Enrichment Script for Washington, DC
 * Input: google_filtered_dc.json
 * Output: tiktok_enriched_dc.json
 *
 * REQUIREMENTS:
 * 1) TikTok API (Apify or custom scraper endpoint)
 * 2) OpenAI API for classification
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INPUT_FILE = path.join(process.cwd(), "google_filtered_dc.json");
const OUTPUT_FILE = path.join(process.cwd(), "tiktok_enriched_dc.json");

// YOUR APIFY DATASET ENDPOINTS HERE:
const TIKTOK_SEARCH_ENDPOINT = process.env.TIKTOK_SEARCH_API;

if (!TIKTOK_SEARCH_ENDPOINT) {
  console.error("❌ Missing TIKTOK_SEARCH_API. Use export TIKTOK_SEARCH_API='https://api.apify.com/...'");
  process.exit(1);
}

// -----------------------------
// LOAD FILE
// -----------------------------

function loadFile(f) {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch (err) {
    console.error("❌ Failed to load", f, err);
    process.exit(1);
  }
}

// -----------------------------
// TIKTOK SEARCH
// -----------------------------

async function searchTikTok(query) {
  try {
    const url = `${TIKTOK_SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url);
    return res.data.items || [];
  } catch (err) {
    console.error("❌ TikTok search failed:", err.message);
    return [];
  }
}

// -----------------------------
// AI CLASSIFIER
// -----------------------------

async function classify(venue, tiktokData) {
  const prompt = `
You are Lumina’s nightlife AI. Analyze the TikTok videos for a venue.

Venue: ${venue.venueName}
Address: ${venue.address}

Videos:
${JSON.stringify(tiktokData, null, 2)}

Extract:

1. vibes (array)
2. crowdType
3. dressCode
4. musicGenres
5. energyLevel (0–10)
6. bestNights (e.g. Friday, Saturday, Thursday)
7. eventType (e.g. brunch party, day party, club night)
8. trendScore (0–10)
9. aestheticScore (0–10)
10. summary (short vibe overview)

Return JSON ONLY with these keys.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const text = response.choices[0].message.content.trim();

    return JSON.parse(text);
  } catch (err) {
    console.error("❌ Classification error:", err.message);
    return null;
  }
}

// -----------------------------
// MAIN
// -----------------------------

async function run() {
  console.log("🔍 Loading DC filtered Google data…");
  const venues = loadFile(INPUT_FILE);

  console.log("🔥 Starting TikTok enrichment…");
  const enriched = [];

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    console.log(`\n-----------------------------------`);
    console.log(`🎥 Enriching (${i + 1}/${venues.length}): ${v.venueName}`);

    const queries = [
      v.venueName,
      `${v.venueName} DC`,
      `${v.venueName} Washington DC`,
      v.address,
    ];

    let tiktokResults = [];
    for (const q of queries) {
      const r = await searchTikTok(q);
      tiktokResults.push(...r);
    }

    // Dedupe TikTok results
    tiktokResults = Object.values(
      tiktokResults.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {})
    );

    const ai = await classify(v, tiktokResults);

    enriched.push({
      ...v,
      tiktok: tiktokResults,
      ai: ai || {},
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
  console.log(`\n✔ Saved TikTok enrichment → ${OUTPUT_FILE}`);
}

run();
