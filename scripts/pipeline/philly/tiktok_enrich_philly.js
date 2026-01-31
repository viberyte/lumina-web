import "dotenv/config";
import fs from "fs";
import axios from "axios";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INPUT_FILE = "super_enriched_philly.json";
const OUTPUT_FILE = "tiktok_enriched_philly.json";

const TIKTOK_SEARCH_ENDPOINT = process.env.TIKTOK_SEARCH_API;

if (!TIKTOK_SEARCH_ENDPOINT) {
  console.error("❌ Missing TIKTOK_SEARCH_API");
  process.exit(1);
}

async function searchTikTok(query) {
  try {
    const url = `${TIKTOK_SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url, { timeout: 30000 });
    return res.data.items || [];
  } catch (err) {
    console.error("❌ TikTok search failed:", err.message);
    return [];
  }
}

async function classify(venue, tiktokData) {
  if (!tiktokData || tiktokData.length === 0) return null;

  const prompt = `Analyze TikTok videos for ${venue.venueName} in Philadelphia.

Videos:
${JSON.stringify(tiktokData.slice(0, 10), null, 2)}

Extract ONLY JSON:
{
  "vibes": [],
  "crowdType": "",
  "dressCode": "",
  "musicGenres": [],
  "energyLevel": 0,
  "bestNights": [],
  "eventType": "",
  "trendScore": 0,
  "aestheticScore": 0,
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
    console.log(`📂 Loaded ${enriched.length} existing TikTok-enriched venues`);
  }

  const enrichedNames = new Set(enriched.map(v => v.venueName));
  const remaining = venues.filter(v => !enrichedNames.has(v.venueName));

  console.log(`🎥 TIKTOK ENRICHING Philly:`);
  console.log(`   Total: ${venues.length}`);
  console.log(`   Already done: ${enriched.length}`);
  console.log(`   Remaining: ${remaining.length}`);

  for (let i = 0; i < remaining.length; i++) {
    const venue = remaining[i];
    console.log(`\n[${enriched.length + 1}/${venues.length}] ${venue.venueName}`);

    const query = `${venue.venueName} Philadelphia`;
    const tiktokData = await searchTikTok(query);
    
    if (tiktokData.length > 0) {
      console.log(`   Found ${tiktokData.length} TikToks`);
      const classification = await classify(venue, tiktokData);
      
      enriched.push({
        ...venue,
        tiktok_data: tiktokData.slice(0, 5),
        tiktok_intelligence: classification
      });
    } else {
      console.log(`   No TikToks found`);
      enriched.push({
        ...venue,
        tiktok_data: [],
        tiktok_intelligence: null
      });
    }

    if (enriched.length % 10 === 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
      console.log(`💾 Progress saved (${enriched.length}/${venues.length})`);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
  console.log(`\n✅ PHILLY TIKTOK COMPLETE! ${enriched.length} venues`);
  process.exit(0);
}

main().catch(console.error);
