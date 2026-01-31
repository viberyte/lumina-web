import "dotenv/config";
import fs from "fs";
import axios from "axios";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INPUT_FILE = "super_enriched_norfolk.json";
const OUTPUT_FILE = "instagram_enriched_norfolk.json";

const INSTAGRAM_SCRAPER_ENDPOINT = process.env.INSTAGRAM_SCRAPER_API;

if (!INSTAGRAM_SCRAPER_ENDPOINT) {
  console.error("❌ Missing INSTAGRAM_SCRAPER_API");
  process.exit(1);
}

async function scrapeInstagram(query) {
  try {
    const url = `${INSTAGRAM_SCRAPER_ENDPOINT}?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url, { timeout: 30000 });
    return {
      posts: res.data.posts || [],
      tags: res.data.tags || [],
      hashtags: res.data.hashtags || [],
      reels: res.data.reels || [],
      profile: res.data.profile || {}
    };
  } catch (err) {
    console.error("❌ IG scraper error:", err.message);
    return null;
  }
}

async function classifyIG(venue, igData) {
  if (!igData || !igData.posts || igData.posts.length === 0) return null;

  const prompt = `Analyze Instagram content for ${venue.venueName} in Norfolk.

Instagram Data:
${JSON.stringify(igData, null, 2)}

Extract ONLY JSON:
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
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const text = response.choices[0].message.content.trim();
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    return json ? JSON.parse(json) : null;
  } catch (err) {
    console.error("❌ Classification error:", err.message);
    return null;
  }
}

async function main() {
  const venues = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  
  let enriched = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    enriched = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    console.log(`📂 Loaded ${enriched.length} existing Instagram-enriched venues`);
  }

  const enrichedNames = new Set(enriched.map(v => v.venueName));
  const remaining = venues.filter(v => !enrichedNames.has(v.venueName));

  console.log(`📸 INSTAGRAM ENRICHING Norfolk:`);
  console.log(`   Total: ${venues.length}`);
  console.log(`   Already done: ${enriched.length}`);
  console.log(`   Remaining: ${remaining.length}`);

  for (let i = 0; i < remaining.length; i++) {
    const venue = remaining[i];
    console.log(`\n[${enriched.length + 1}/${venues.length}] ${venue.venueName}`);

    const query = `${venue.venueName} Norfolk`;
    const igData = await scrapeInstagram(query);
    
    if (igData && igData.posts.length > 0) {
      console.log(`   Found ${igData.posts.length} IG posts`);
      const classification = await classifyIG(venue, igData);
      
      enriched.push({
        ...venue,
        instagram_data: {
          posts: igData.posts.slice(0, 10),
          tags: igData.tags,
          hashtags: igData.hashtags,
          profile: igData.profile
        },
        instagram_intelligence: classification
      });
    } else {
      console.log(`   No IG content found`);
      enriched.push({
        ...venue,
        instagram_data: null,
        instagram_intelligence: null
      });
    }

    if (enriched.length % 10 === 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
      console.log(`💾 Progress saved (${enriched.length}/${venues.length})`);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
  console.log(`\n✅ PHILLY INSTAGRAM COMPLETE! ${enriched.length} venues`);
  process.exit(0);
}

main().catch(console.error);
