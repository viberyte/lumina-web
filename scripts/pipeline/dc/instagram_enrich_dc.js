/**
 * Instagram Enrichment Script for Washington, DC
 * Input: google_filtered_dc.json
 * Output: instagram_enriched_dc.json
 *
 * REQUIREMENTS:
 * - An Instagram scraper endpoint (Apify or custom)
 * - OpenAI API for event + vibe extraction
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Your Instagram scraping endpoint from Apify or custom scraper
const INSTAGRAM_SCRAPER_ENDPOINT = process.env.INSTAGRAM_SCRAPER_API;

if (!INSTAGRAM_SCRAPER_ENDPOINT) {
  console.error("❌ Missing INSTAGRAM_SCRAPER_API. Use export INSTAGRAM_SCRAPER_API='https://api.apify.com/...'");
  process.exit(1);
}

const INPUT_FILE = path.join(process.cwd(), "google_filtered_dc.json");
const OUTPUT_FILE = path.join(process.cwd(), "instagram_enriched_dc.json");

// ----------------------------------------------------
// LOAD FILE
// ----------------------------------------------------

function loadFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error("❌ Failed to load:", file);
    process.exit(1);
  }
}

// ----------------------------------------------------
// Instagram Scraper
// ----------------------------------------------------

async function scrapeInstagram(query) {
  try {
    const url = `${INSTAGRAM_SCRAPER_ENDPOINT}?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url);

    return {
      posts: res.data.posts || [],
      tags: res.data.tags || [],
      hashtags: res.data.hashtags || [],
      reels: res.data.reels || [],
      stories: res.data.stories || [],
      profile: res.data.profile || {}
    };
  } catch (err) {
    console.error("❌ IG scraper error:", err.message);
    return null;
  }
}

// ----------------------------------------------------
// AI CLASSIFIER for IG Event Vibes
// ----------------------------------------------------

async function classifyIG(venue, igData) {
  const prompt = `
You are Lumina, an AI nightlife engine. Analyze Instagram content to extract nightlife intelligence.

Venue: ${venue.venueName}
Address: ${venue.address}

Instagram Data:
${JSON.stringify(igData, null, 2)}

Extract and return ONLY JSON with:
{
  "eventTypes": [],
  "recurringEvents": [],
  "musicGenres": [],
  "dressCode": "",
  "crowdType": "",
  "promoters": [],
  "bestNights": [],
  "trendScoreIG": 0,
  "aestheticScoreIG": 0,
  "summary": ""
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const txt = response.choices[0].message.content.trim();
    return JSON.parse(txt);

  } catch (err) {
    console.error("❌ IG Classification error:", err.message);
    return null;
  }
}

// ----------------------------------------------------
// MAIN SCRIPT
// ----------------------------------------------------

async function run() {
  console.log("🔍 Loading filtered Google DC venues…");
  const venues = loadFile(INPUT_FILE);

  const enriched = [];

  console.log(`🔥 Starting Instagram enrichment for ${venues.length} venues…`);

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    console.log(`\n-------------------------------------`);
    console.log(`📸 Enriching IG (${i + 1}/${venues.length}): ${v.venueName}`);

    const queries = [
      v.venueName,
      `${v.venueName} DC`,
      `${v.venueName} Washington DC`,
      `${v.venueName.replace(/ /g, '')}`
    ];

    let igData = null;
    for (const q of queries) {
      igData = await scrapeInstagram(q);
      if (igData && igData.posts && igData.posts.length > 0) break;
    }

    if (!igData) {
      console.log("⚠️ No IG data found, skipping…");
      enriched.push({ ...v, instagram: {}, ai_ig: {} });
      continue;
    }

    const ai = await classifyIG(v, igData);

    enriched.push({
      ...v,
      instagram: igData,
      ai_ig: ai || {}
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
  console.log(`\n✔ Saved Instagram enrichment → ${OUTPUT_FILE}`);
}

run();
