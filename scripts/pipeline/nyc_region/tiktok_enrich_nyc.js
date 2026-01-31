/**
 * TIKTOK ENRICHMENT FOR NYC REGION
 * --------------------------------
 * Input:  nyc_region_final.json
 * Output: nyc_region_with_tiktok.json
 *
 * Uses Apify TikTok Search Actor API
 * to extract:
 *   - captions
 *   - hashtags
 *   - vibe keywords
 *   - crowd type
 *   - music genres
 *   - trend signals
 */

import fs from "fs";
import fetch from "node-fetch";

// Load Apify Token
const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("❌ Missing APIFY_TOKEN in environment.");
  process.exit(1);
}

const INPUT = "nyc_region_final.json";
const OUTPUT = "nyc_region_with_tiktok.json";

async function fetchTikTokResults(venueName) {
  const url =
    `https://api.apify.com/v2/acts/apify~tiktok-scraper/run-sync?token=${APIFY_TOKEN}`;

  const payload = {
    search: venueName,
    maxItems: 10,
    shouldDownloadVideos: false,
    shouldDownloadCovers: true,
    shouldDownloadSlideshowImages: true,
    scrapeRelatedVideos: true
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.defaultDatasetItems || [];

  } catch (err) {
    console.error("TikTok fetch error:", err.message);
    return null;
  }
}

function extractVibes(text) {
  text = text.toLowerCase();

  const vibes = [];
  const vibeWords = [
    "vibe", "chill", "lit", "trendy", "romantic", "urban", "luxury",
    "upscale", "aesthetic", "cozy", "energetic", "classy"
  ];

  for (const v of vibeWords) {
    if (text.includes(v)) vibes.push(v);
  }

  return [...new Set(vibes)];
}

function extractCrowd(text) {
  const words = text.toLowerCase();
  if (words.includes("college")) return "college crowd";
  if (words.includes("professionals")) return "young professionals";
  if (words.includes("tourist")) return "tourists";
  if (words.includes("locals")) return "locals";
  return "";
}

function extractMusic(text) {
  const words = text.toLowerCase();

  const genres = [];
  if (words.includes("hip hop")) genres.push("Hip-Hop");
  if (words.includes("r&b") || words.includes("rnb")) genres.push("R&B");
  if (words.includes("afrobeats")) genres.push("Afrobeats");
  if (words.includes("latin")) genres.push("Latin");
  if (words.includes("house")) genres.push("House");
  if (words.includes("edm")) genres.push("EDM");
  if (words.includes("reggae")) genres.push("Reggae");

  return genres;
}

function computeTrendScore(items) {
  if (!items || items.length === 0) return 0;

  // basic scoring based on engagement
  let score = items.length * 1.5;

  for (const v of items) {
    if (v.diggCount) score += v.diggCount * 0.002;
    if (v.shareCount) score += v.shareCount * 0.003;
  }

  return Math.min(10, Math.round(score * 10) / 10);
}

async function run() {
  const venues = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  console.log(`🔥 TikTok enrichment starting for ${venues.length} venues…`);

  const out = [];

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    console.log(`Progress: ${i + 1}/${venues.length} → ${v.venueName}`);

    const items = await fetchTikTokResults(v.venueName);

    if (!items) {
      out.push({ ...v, tiktokTrendScore: 0 });
      continue;
    }

    const captions = items.map(x => x.text || "");
    const hashtags = items.flatMap(x => x.hashtags || []).map(h => h.name || "");

    const combinedText = captions.join(" ").toLowerCase();

    const vibesBoost = extractVibes(combinedText);
    const crowdBoost = extractCrowd(combinedText);
    const musicBoost = extractMusic(combinedText);
    const trendScore = computeTrendScore(items);

    out.push({
      ...v,
      tiktokCaptions: captions,
      tiktokHashtags: [...new Set(hashtags)],
      tiktokTrendScore: trendScore,
      vibesBoost,
      crowdBoost,
      musicGenresBoost: musicBoost
    });
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2));
  console.log(`✔ Saved → ${OUTPUT}`);
  console.log("🔥 TikTok enrichment complete.");
}

run();
