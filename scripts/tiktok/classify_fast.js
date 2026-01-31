import fs from "fs";
import OpenAI from "openai";
import pLimit from "p-limit";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// === CONFIG ===
const MODEL = "gpt-4o-mini";
const CONCURRENCY = 6;   // 🔥 run 6 LLM requests at once (safe)
const BATCH_SAVE_INTERVAL = 25;

// === JSON cleaner ===
function cleanJSON(text) {
  if (!text) return null;

  text = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1) return null;

  const sliced = text.slice(start, end + 1);

  try {
    return JSON.parse(sliced);
  } catch (e) {
    console.error("⚠️ JSON parse failure:", e.message);
    console.error("Raw content:", text);
    return null;
  }
}

// === Single-item classifier ===
async function classify(item) {
  const prompt = `
Return ONLY a JSON object.

Classify the nightlife content:

${JSON.stringify(item, null, 2)}

JSON format:
{
  "venueName": "...",
  "venueType": "...",
  "vibes": [],
  "musicGenres": [],
  "dressCode": "...",
  "neighborhood": "...",
  "priceTier": "...",
  "crowdType": "...",
  "eventType": "...",
  "day": "...",
  "timeOfDay": "...",
  "trendScore": 0.0
}
  `;

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2
  });

  return cleanJSON(res.choices[0].message.content);
}

// === Process full file in fast concurrent mode ===
async function processFile(inputFile, outputFile) {
  const data = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  console.log(`\n🔥 Classifying ${data.length} items: ${inputFile}`);

  const limit = pLimit(CONCURRENCY);
  const results = [];
  let completed = 0;

  for (let i = 0; i < data.length; i++) {
    results[i] = limit(async () => {
      const result = await classify(data[i]);
      completed++;

      if (completed % 25 === 0) {
        console.log(`Progress: ${completed}/${data.length}`);
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
      }

      return result;
    });
  }

  // Await completion of all promises
  await Promise.all(results);

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`✔ Completed: ${outputFile}`);
}

// === MAIN ===
async function main() {
  await processFile("venue_candidates.json", "venue_classified.json");
  await processFile("event_candidates.json", "event_classified.json");
}

main();
