/**
 * Vision Enrichment Script for Washington, DC
 * Adds aesthetic intelligence using OpenAI Vision
 *
 * Input: google_filtered_dc.json
 * Also optionally reads:
 *   - tiktok_enriched_dc.json
 *   - instagram_enriched_dc.json
 *   - yelp_enriched_dc.json
 *
 * Output: vision_enriched_dc.json
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Input priority (whichever exists)
const INPUT_FILES = [
  "tiktok_enriched_dc.json",
  "instagram_enriched_dc.json",
  "yelp_enriched_dc.json",
  "google_filtered_dc.json",
];

let INPUT_FILE = null;

// ----------------------------------
// Pick the first available file
// ----------------------------------

for (const f of INPUT_FILES) {
  if (fs.existsSync(f)) {
    INPUT_FILE = f;
    break;
  }
}

if (!INPUT_FILE) {
  console.error("❌ No DC input files found for vision enrichment.");
  process.exit(1);
}

const OUTPUT_FILE = "vision_enriched_dc.json";

console.log(`🔍 Using input file for vision enrichment → ${INPUT_FILE}`);


// ----------------------------------
// Extract images from all platforms
// ----------------------------------

function collectImages(entry) {
  let imgs = [];

  // Google photos
  if (entry.photos && Array.isArray(entry.photos)) {
    for (const p of entry.photos) {
      if (p.photo_reference) imgs.push(p.photo_reference_url || "");
    }
  }

  // TikTok covers
  if (entry.tiktok && Array.isArray(entry.tiktok)) {
    for (const vid of entry.tiktok) {
      if (vid.cover) imgs.push(vid.cover);
      if (vid.imageUrl) imgs.push(vid.imageUrl);
    }
  }

  // Instagram posts
  if (entry.instagram?.posts) {
    for (const post of entry.instagram.posts) {
      if (post.image) imgs.push(post.image);
      if (post.thumbnail) imgs.push(post.thumbnail);
    }
  }

  // Yelp photos
  if (entry.yelp?.photos) {
    imgs.push(...entry.yelp.photos);
  }

  // Remove invalid or empty
  imgs = imgs.filter(x => x && x.length > 5);

  return imgs.slice(0, 5); // limit to 5 images per venue
}


// ----------------------------------
// Vision Classification
// ----------------------------------

async function classifyImages(venue, images) {
  if (images.length === 0) return null;

  const prompt = `
You are Lumina’s Aesthetic Intelligence Engine.
Analyze these images of a nightlife venue and return STRICT JSON ONLY.

Extract:

- aestheticScore (0–10)
- luxuryScore (0–10)
- lightingQuality (string)
- decorStyle (string)
- ambianceTags (array)
- crowdAttractiveness (0–10)
- fashionStyle (string)
- colorPalette (array)
- tiktokabilityScore (0–10)
- summary (short vibe summary)

Return ONLY JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...images.map(url => ({
              type: "image_url",
              image_url: { url },
            })),
          ],
        },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0].message.content.trim();
    return JSON.parse(text);

  } catch (err) {
    console.error("❌ Vision error:", err.message);
    return null;
  }
}


// ----------------------------------
// MAIN PIPELINE
// ----------------------------------

async function run() {
  const venues = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const final = [];

  console.log(`🔥 Starting OpenAI Vision enrichment for ${venues.length} venues…`);

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];

    console.log(`\n-------------------------------------`);
    console.log(`🖼️ Vision Enriching (${i + 1}/${venues.length}): ${v.venueName}`);

    const images = collectImages(v);

    if (images.length === 0) {
      console.log("⚠️ No images found — skipping.");
      final.push({ ...v, vision: {} });
      continue;
    }

    const visionData = await classifyImages(v, images);

    final.push({
      ...v,
      vision: visionData || {},
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(final, null, 2));
  console.log(`\n✔ Saved Vision enrichment → ${OUTPUT_FILE}`);
}

run();
