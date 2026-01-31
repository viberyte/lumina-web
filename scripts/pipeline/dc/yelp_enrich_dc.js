/**
 * Yelp Enrichment Script for Washington, DC
 * Input: google_filtered_dc.json
 * Output: yelp_enriched_dc.json
 *
 * REQUIREMENTS:
 * export YELP_API_KEY="XXXX"
 * export OPENAI_API_KEY="XXXX"
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const YELP_KEY = process.env.YELP_API_KEY;

if (!YELP_KEY) {
  console.error("❌ Missing YELP_API_KEY. Run: export YELP_API_KEY=xxxx");
  process.exit(1);
}

const YELP_URL = "https://api.yelp.com/v3/businesses/search";
const DETAILS_URL = "https://api.yelp.com/v3/businesses/";

const INPUT_FILE = "google_filtered_dc.json";
const OUTPUT_FILE = "yelp_enriched_dc.json";

// ------------------------------------------
// LOAD FILE
// ------------------------------------------

function loadFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error("❌ Failed to load:", file, err);
    process.exit(1);
  }
}

// ------------------------------------------
// YELP SEARCH
// ------------------------------------------

async function searchYelp(name, address) {
  try {
    const res = await axios.get(YELP_URL, {
      headers: { Authorization: `Bearer ${YELP_KEY}` },
      params: {
        term: name,
        location: "Washington DC",
        limit: 3
      }
    });

    return res.data.businesses?.[0] || null;

  } catch (err) {
    console.error("❌ Yelp search error:", err.response?.data || err.message);
    return null;
  }
}

// ------------------------------------------
// FETCH YELP DETAILS
// ------------------------------------------

async function getYelpDetails(id) {
  try {
    const res = await axios.get(`${DETAILS_URL}${id}`, {
      headers: { Authorization: `Bearer ${YELP_KEY}` },
    });

    return res.data;

  } catch (err) {
    console.error("❌ Yelp details error:", err.message);
    return null;
  }
}

// ------------------------------------------
// AI Sentiment + Vibe Extraction
// ------------------------------------------

async function classifyYelp(venue, yelpData) {
  const prompt = `
You are Lumina's AI nightlife engine. Analyze Yelp data and extract nightlife intelligence.

Venue: ${venue.venueName}
Address: ${venue.address}

Yelp Data:
${JSON.stringify(yelpData, null, 2)}

Return ONLY JSON with:

{
  "priceTier": "",
  "sentimentScore": 0,
  "keywords": [],
  "crowdSentiment": "",
  "noiseLevel": "",
  "serviceQuality": "",
  "safetyFlags": [],
  "summary": ""
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0].message.content.trim();
    return JSON.parse(text);

  } catch (err) {
    console.error("❌ AI Yelp classifier error:", err.message);
    return null;
  }
}

// ------------------------------------------
// MAIN PIPELINE
// ------------------------------------------

async function run() {
  console.log("🔍 Loading filtered Google data...");
  const venues = loadFile(INPUT_FILE);

  const output = [];

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    console.log(`\n-------------------------------------`);
    console.log(`⭐ Yelp Enriching (${i + 1}/${venues.length}): ${v.venueName}`);

    const business = await searchYelp(v.venueName, v.address);

    if (!business) {
      console.log("⚠️ No Yelp match found.");
      output.push({ ...v, yelp: {}, ai_yelp: {} });
      continue;
    }

    const details = await getYelpDetails(business.id);

    const ai = await classifyYelp(v, details);

    output.push({
      ...v,
      yelp: details,
      ai_yelp: ai || {}
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n✔ Saved Yelp enrichment → ${OUTPUT_FILE}`);
}

run();
