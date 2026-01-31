import "dotenv/config";
import fs from "fs";
import axios from "axios";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INPUT_FILE = "super_enriched_philly.json";
const OUTPUT_FILE = "instagram_enriched_philly.json";

const APIFY_TOKEN = process.env.APIFY_API_KEY || "apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel";

async function scrapeInstagram(query) {
  try {
    const url = `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
    const res = await axios.post(url, {
      search: query,
      resultsLimit: 10
    }, { 
      timeout: 120000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    return res.data || [];
  } catch (err) {
    console.error("❌ IG scraper error:", err.message);
    return [];
  }
}

async function classifyIG(venue, igData) {
  if (!igData || igData.length === 0) return null;

  const prompt = `Analyze Instagram content for ${venue.venueName} in Philadelphia.

Instagram Data (${igData.length} results):
${JSON.stringify(igData.slice(0, 3).map(p => ({
  caption: p.caption?.substring(0, 200),
  hashtags: p.hashtags,
  likesCount: p.likesCount,
  commentsCount: p.commentsCount
})), null, 2)}

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

  console.log(`📸 INSTAGRAM ENRICHING Philly:`);
  console.log(`   Total: ${venues.length}`);
  console.log(`   Already done: ${enriched.length}`);
  console.log(`   Remaining: ${remaining.length}`);

  for (let i = 0; i < remaining.length; i++) {
    const venue = remaining[i];
    console.log(`\n[${enriched.length + 1}/${venues.length}] ${venue.venueName}`);

    const query = `${venue.venueName} Philadelphia`;
    const igData = await scrapeInstagram(query);
    
    if (igData.length > 0) {
      console.log(`   ✅ Found ${igData.length} IG results`);
      const classification = await classifyIG(venue, igData);
      
      enriched.push({
        ...venue,
        instagram_data: igData.slice(0, 10).map(p => ({
          caption: p.caption,
          hashtags: p.hashtags,
          likesCount: p.likesCount,
          commentsCount: p.commentsCount,
          timestamp: p.timestamp,
          url: p.url
        })),
        instagram_intelligence: classification
      });
    } else {
      console.log(`   ⚠️  No IG content found`);
      enriched.push({
        ...venue,
        instagram_data: [],
        instagram_intelligence: null
      });
    }

    if (enriched.length % 10 === 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
      console.log(`💾 Progress saved (${enriched.length}/${venues.length})`);
    }
    
    // Rate limit: wait 3 seconds between requests
    await new Promise(r => setTimeout(r, 3000));
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
  console.log(`\n✅ PHILLY INSTAGRAM COMPLETE! ${enriched.length} venues`);
  process.exit(0);
}

main().catch(console.error);
