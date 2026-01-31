/**
 * Vision AI Enrichment — NYC + North Jersey
 *
 * Input:
 *   google_filtered_nyc_region.json
 *   (optional: tiktok_enriched_nyc_region.json)
 *   (optional: instagram_enriched_nyc_region.json)
 *
 * Output:
 *   vision_enriched_nyc_region.json
 *
 * Extracts:
 *   - aestheticScore
 *   - luxuryScore
 *   - tiktokabilityScore
 *   - ambience
 *   - crowdAttractiveness
 *   - fashionLevel
 */

import fs from "fs";
import fetch from "node-fetch";

const INPUT = "google_filtered_nyc_region.json";
const OUTPUT = "vision_enriched_nyc_region.json";

if (!fs.existsSync(INPUT)) {
  console.error("❌ Missing google_filtered_nyc_region.json");
  process.exit(1);
}

const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.error("❌ Missing OPENAI_API_KEY");
  process.exit(1);
}

const venues = JSON.parse(fs.readFileSync(INPUT, "utf8"));

console.log(`🔥 Vision Enrichment for NYC Region: ${venues.length} venues`);

function collectImages(v) {
  const images = [];

  if (v.photos) {
    for (const p of v.photos) images.push(p);
  }

  if (v.instagram?.images) {
    for (const img of v.instagram.images) images.push(img);
  }

  if (v.tiktok) {
    for (const t of v.tiktok) {
      if (t.coverUrl) images.push(t.coverUrl);
      if (t.preview) images.push(t.preview);
    }
  }

  return images.slice(0, 10); // limit for performance
}

// Vision classifier
async function visionDescribe(photoUrls) {
  if (photoUrls.length === 0) return {};

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
Analyze these venue images and provide JSON:

{
  "aestheticScore": 0-10,
  "luxuryScore": 0-10,
  "tikTokabilityScore": 0-10,
  "ambience": "romantic / dark / neon / rooftop / energetic / candle-lit / upscale / chaotic",
  "crowdAttractiveness": 0-10,
  "fashionLevel": 0-10,
  "designStyle": "modern, industrial, luxury, tropical, minimalist, elegant, etc.",
  "summary": "one-sentence description"
}

Images:
${photoUrls.join("\n")}
`
          }
        ]
      })
    });

    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("❌ Vision AI error:", err.message);
    return {};
  }
}

async function enrichVenue(v) {
  console.log(`👁 Vision → ${v.venueName}`);

  const photos = collectImages(v);

  const visionData = await visionDescribe(photos);

  return {
    ...v,
    vision: visionData
  };
}

async function run() {
  const out = [];

  for (let i = 0; i < venues.length; i++) {
    console.log(`Progress: ${i + 1}/${venues.length}`);
    out.push(await enrichVenue(venues[i]));
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2));
  console.log(`✔ Saved → ${OUTPUT}`);
}

run();
