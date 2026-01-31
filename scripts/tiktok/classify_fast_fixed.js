import fs from "fs";
import OpenAI from "openai";
import pLimit from "p-limit";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-4o-mini";
const CONCURRENCY = 6;

// Convert hashtags from objects → strings
const extractHashtags = (arr) =>
  Array.isArray(arr) ? arr.map(h => h.name || h).filter(Boolean) : [];

// Clean GPT output
function cleanJSON(text) {
  if (!text) return null;
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function classify(item) {
  const hashtags = extractHashtags(item.hashtags);

  const prompt = `
Classify this nightlife TikTok post. Return ONLY JSON.

Caption: ${item.caption}
Hashtags: ${hashtags.join(", ")}
Venue Hint: ${item.venueName}
Location: ${item.locationName}
Address: ${item.address}

JSON ONLY:
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
`;

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  return cleanJSON(res.choices[0].message.content);
}

async function processFile(inFile, outFile) {
  const data = JSON.parse(fs.readFileSync(inFile, "utf8"));
  const limit = pLimit(CONCURRENCY);
  const results = Array(data.length);
  let count = 0;

  console.log(`🔥 Classifying ${data.length} items from ${inFile}`);

  const tasks = data.map((item, i) =>
    limit(async () => {
      const r = await classify(item);
      results[i] = r || null;
      count++;
      if (count % 25 === 0)
        console.log(`Progress: ${count}/${data.length}`);
    })
  );

  await Promise.all(tasks);
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`✔ Saved → ${outFile}`);
}

async function main() {
  await processFile("venue_filtered.json", "venue_classified.json");
  await processFile("event_filtered.json", "event_classified.json");
}

main();
