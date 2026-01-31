import sqlite3Base from 'sqlite3';
import OpenAI from 'openai';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sqlite3 = sqlite3Base.verbose();
const db = new sqlite3.Database(__dirname + '/lumina.db');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const LLM_PROMPT_TEXT = fs.readFileSync(__dirname + '/llm_tagging_prompt.txt', 'utf8');

// --- 2. FINAL SQL UPDATE STATEMENT (Updating the permanent table) ---
const SQL_UPDATE_TAGS = `
    UPDATE clean_venues 
    SET 
        cuisine_json = ?,
        vibe_mood_json = ?,
        experience_feature_json = ?
    WHERE 
        place_id = ?; 
`; 

// --- 3. CORE TAGGING AND UPDATE FUNCTION (Unchanged) ---
async function processVenueForTags(venue) {
    try {
        let finalPrompt = LLM_PROMPT_TEXT;
        finalPrompt = finalPrompt.replace("[The actual venue ID will be inserted here, e.g., ChIJKV55sS_YQIARU9n-I94j5YQ]", venue.place_id);
        finalPrompt = finalPrompt.replace("[Venue Name]", venue.name);
        finalPrompt = finalPrompt.replace("[Description]", venue.description);
        finalPrompt = finalPrompt.replace("[Keywords]", venue.keywords || 'N/A');

        const llmResponse = await openai.chat.completions.create({
            model: 'gpt-4o', 
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: finalPrompt }],
            temperature: 0.1 
        });

        const tags = JSON.parse(llmResponse.choices[0].message.content);
        
        const venueId = tags.venue_id;

        if (venueId !== venue.place_id) {
             throw new Error(`LLM failed to copy ID: Expected ${venue.place_id}, got ${venueId}`);
        }

        const cuisine_json_str = JSON.stringify(tags.cuisine_type);
        const vibe_mood_json_str = JSON.stringify({
            vibe_tags: tags.vibe_tags, 
            mood_tags: tags.mood_tags
        });
        const experience_feature_json_str = JSON.stringify({
            experience_type: tags.experience_type,
            feature_tags: tags.feature_tags
        });

        db.run(
            SQL_UPDATE_TAGS, 
            [
                cuisine_json_str, 
                vibe_mood_json_str, 
                experience_feature_json_str, 
                venueId
            ], 
            function (err) { 
                if (err) {
                    console.error(`DB FAILED update ${venueId}:`, err.message);
                } else {
                    console.log(`UPDATE SUCCESS: ${venueId} updated. Rows changed: ${this.changes}`);
                }
            }
        );

    } catch (error) {
        console.error(`LLM API FAILED for a venue:`, error.message);
    }
}

// --- 4. SCALABLE USAGE (Replace with a query to fetch ALL your venues) ---
// ******************************************************************************
// ** Replace this sample code with logic to query ALL IDs from your clean_venues table **
// ******************************************************************************
const sampleVenues = [
    { place_id: "ChIJKV55sS_YQIARU9n-I94j5YQ", name: 'The Fancy Diner', description: 'Excellent spot for a romantic date, known for Italian food.', keywords: 'romantic, handmade pasta, wine, intimate' },
    // ADD MORE VENUES HERE (e.g., from a batch query to your DB)
];

(async () => {
    console.log(`Starting FULL RE-TAGGING JOB for ${sampleVenues.length} venue(s)...`);
    // In a real job, you'd loop through all venues fetched from your DB
    for (const venue of sampleVenues) {
        await processVenueForTags({ 
            ...venue, 
            venue_id: venue.place_id 
        });
    }
    setTimeout(() => db.close(), 5000); 
})();
