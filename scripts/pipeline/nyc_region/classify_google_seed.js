/**
 * NYC REGION — LLM Classification Pipeline
 * ----------------------------------------
 * Input:
 *   google_seed_nyc_region_filtered.json
 *
 * Output:
 *   google_seed_nyc_region_classified.json
 *
 * Adds:
 *   - venueType (Bar / Lounge / Nightclub / Rooftop / Restaurant / Speakeasy)
 *   - vibes (luxury, trendy, urban, romantic, chill, upscale, etc.)
 *   - musicGenres
 *   - dressCode
 *   - crowdType
 *   - priceTier
 *   - neighborhood (LLM inferred)
 *   - eventType (if nightlife)
 *   - day/time patterns
 *   - trendScore (0–10)
 */

import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const INPUT = "google_seed_nyc_region_filtered.json";
const OUTPUT = "google_seed_nyc_region_classified.json";

// Batch size = parallel calls for speed
const BATCH = 20;

const SYSTEM_PROMPT = `
You are Lumina's nightlife classification engine.

Your job:
Given a venue name + minimal Google data,
output a STRICT JSON object with these fields:

{
  "venueName": "",
  "venueType": "", 
  "vibes": [],
  "musicGenres": [],
  "dressCode": "",
  "neighborhood": "",
  "priceTier": "",
  "crowdType": "",
  "eventType": "",
  "day": "",
  "timeOfDay": "",
  "trendScore": 0
}

Rules:
- venueType must be one of:
  ["Bar", "Lounge", "Nightclub", "Rooftop", "Restaurant / Dining", "Speakeasy", "Event Space"]
- vibes must be aesthetic categories only
- NEVER reference Google directly
- NEVER write explanations
- ONLY output valid JSON and nothing else
`;

async function classifyOne(v) {
  const userPrompt = `
Classify this venue:

Name: ${v.venueName}
Address: ${v.address || ""}
Rating: ${v.rating || "unknown"}
Keyword: ${v.sourceKeyword || ""}
City Area: ${v.searchArea || ""}

Return ONLY the JSON object.
  `.trim();

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ]
    });

    const text = resp.choices[0].message.content.trim();

    // Ensure it's valid JSON only
    return JSON.parse(text);

  } catch (err) {
    console.error("❌ Error classifying:", v.venueName, err.message);
    return null;
  }
}

async function classifyBatch(batch) {
  const promises = batch.map(v => classifyOne(v));
  const results = await Promise.all(promises);
  return results.filter(r => r !== null);
}

async function run() {
  if (!fs.existsSync(INPUT)) {
    console.error("❌ Missing input:", INPUT);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  console.log(`🔥 Classifying ${data.length} NYC region venues…`);

  const out = [];
  let i = 0;

  while (i < data.length) {
    const chunk = data.slice(i, i + BATCH);

    console.log(`Progress: ${i}/${data.length}`);

    const classified = await classifyBatch(chunk);
    out.push(...classified);

    i += BATCH;
  }

  console.log(`✔ Completed: ${out.length} classified venues`);
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2));
  console.log(`✔ Saved → ${OUTPUT}`);
}

run();
