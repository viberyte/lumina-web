import "dotenv/config";
import OpenAI from "openai";
import Database from "better-sqlite3";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const LUMINA_MODEL = "ft:gpt-4o-mini-2024-07-18:lumina-nightlife-v1:ftjob-TkuN1J815zr11qBRLSADYXEJ";

async function luminaChat(userMessage, userContext = {}) {
  // Get relevant venues from database
  const venues = db.prepare(`
    SELECT name, category, primary_vibes, lounge_type, energy_level, 
           first_date_suitable, anniversary_suitable, pregame_suitable
    FROM venues 
    WHERE city = ? 
    LIMIT 50
  `).all(userContext.city || 'New York');

  // System prompt that leverages Lumina's training
  const systemPrompt = `You are Lumina, an AI nightlife concierge. You've been trained on 2,047 real venues and understand:
- Vibes: upscale, trendy, romantic, lively, casual, sophisticated
- Use cases: first dates, anniversaries, pregame, girls night, guys night
- Energy levels: calm, moderate, lively, high
- Music genres and crowd types

Available venues in ${userContext.city || 'New York'}:
${JSON.stringify(venues.slice(0, 10))}

Be conversational, confident, and specific. Reference actual venues.`;

  const response = await openai.chat.completions.create({
    model: LUMINA_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7
  });

  return response.choices[0].message.content;
}

// Test it
luminaChat("I need a romantic spot for my anniversary in NYC", { city: "New York" })
  .then(response => {
    console.log("\n🤖 LUMINA AI RESPONSE:");
    console.log(response);
  })
  .catch(console.error);
