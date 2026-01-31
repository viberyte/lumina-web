/**
 * Yelp Enrichment — NYC + North Jersey
 *
 * Input:
 *   google_filtered_nyc_region.json
 *
 * Output:
 *   yelp_enriched_nyc_region.json
 *
 * Uses:
 *   Yelp Fusion API
 *   OpenAI sentiment classifier
 */

import fs from "fs";
import fetch from "node-fetch";

const INPUT = "google_filtered_nyc_region.json";
const OUTPUT = "yelp_enriched_nyc_region.json";

const YELP_KEY = process.env.YELP_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!YELP_KEY) {
  console.error("❌ Missing YELP_API_KEY");
  process.exit(1);
}

if (!OPENAI_KEY) {
  console.error("❌ Missing OPENAI_API_KEY");
  process.exit(1);
}

const venues = JSON.parse(fs.readFileSync(INPUT, "utf8"));

console.log(`🔥 Yelp Enrichment for NYC Region: ${venues.length} venues`);

async function fetchYelpData(v) {
  const endpoint = `https://api.yelp.com/v3/businesses/search`;

  const query = v.venueName + " " + (v.address || "");

  try {
    const res = await fetch(`${endpoint}?location=New York&term=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${YELP_KEY}` }
    });

    const json = await res.json();

    if (!json.businesses || json.businesses.length === 0) return null;

    const b = json.businesses[0];

    return {
      rating: b.rating,
      reviewCount: b.review_count,
      price: b.price || "",
      categories: b.categories ? b.categories.map(c => c.title) : [],
      yelpUrl: b.url
    };
  } catch (err) {
    console.error("❌ Yelp error for", v.venueName, err.message);
    return null;
  }
}

async function classifySentiment(text) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `
Analyze these Yelp reviews and extract:

- sentimentScore (0–10)
- vibeKeywords
- crowdDescription
- safetyNotes
- noiseLevel
- priceTier
- energyLevel
- summary (1 sentence)

Reviews:
${text}
`
          }
        ]
      })
    });

    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ Sentiment classify error:", err.message);
    return {};
  }
}

async function enrichVenue(v) {
  console.log(`⭐ Yelp → ${v.venueName}`);

  const yelpData = await fetchYelpData(v);

  if (!yelpData) return v;

  const sentiment = await classifySentiment(JSON.stringify(yelpData));

  return {
    ...v,
    yelp: yelpData,
    ai_yelp: sentiment
  };
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
