import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Clean and extract JSON from LLM response
function extractJSON(text) {
  if (!text) return null;

  // Remove code fences: ```json  ```  ```
  text = text.replace(/```json/gi, "");
  text = text.replace(/```/g, "");

  // Trim whitespace
  text = text.trim();

  // Find first { and last }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1) return null;

  const jsonString = text.slice(start, end + 1);

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("❌ JSON parse fail:", err);
    console.error("Raw returned text:", text);
    return null;
  }
}

async function classifyItem(type, item) {
  const prompt = `
You are Lumina, an expert nightlife intelligence model.

Classify the following TikTok nightlife entry into structured JSON ONLY.

ENTRY:
${JSON.stringify(item, null, 2)}

Return ONLY a JSON object with fields:

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
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2
  });

  const content = res.choices[0].message.content;
  return extractJSON(content);
}

async function processFile(inputFile, outputFile, type) {
  const data = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  const out = [];

  console.log(`\nProcessing ${data.length} ${type} items…`);

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    const classified = await classifyItem(type, item);
    out.push(classified);

    // Save progress every 50 items
    if (i % 50 === 0) {
      console.log(`Progress: ${i}/${data.length}`);
      fs.writeFileSync(outputFile, JSON.stringify(out, null, 2));
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(out, null, 2));
  console.log(`✔ Finished ${type}: ${outputFile}`);
}

async function main() {
  await processFile(
    "venue_candidates.json",
    "venue_classified.json",
    "venues"
  );

  await processFile(
    "event_candidates.json",
    "event_classified.json",
    "events"
  );
}

main();
