import sqlite3Base from 'sqlite3';
import OpenAI from 'openai';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sqlite3 = sqlite3Base.verbose();
// FIX: Correcting path to look in the 'data/' subdirectory
const db = new sqlite3.Database(__dirname + '/data/lumina.db'); 

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const LLM_PROMPT_TEXT = fs.readFileSync(__dirname + '/llm_tagging_prompt.txt', 'utf8');

// --- 2. SQL UPDATE STATEMENT (Using the most likely table name 'venues') ---
const SQL_UPDATE_TAGS = `
    UPDATE venues 
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

// --- 4. SCALING LOGIC (Reads from the 'venues' table) ---
function getAllVenuesFromDB() {
    return new Promise((resolve, reject) => {
        db.all("SELECT place_id, name, description, keywords FROM venues", [], (err, rows) => {
            if (err) {
                // We resolve with an empty array if the table is still wrong, but now we know the path is right.
                console.error(`WARNING: Failed to read from table 'venues': ${err.message}`);
                return resolve([]);
            } else {
                resolve(rows.map(row => ({
                    place_id: row.place_id,
                    name: row.name,
                    description: row.description || '',
                    keywords: row.keywords || ''
                })));
            }
        });
    });
}

(async () => {
    try {
        const venuesToTag = await getAllVenuesFromDB();
        console.log(`Starting FULL RE-TAGGING JOB for ${venuesToTag.length} venues...`);

        if (venuesToTag.length === 0) {
             console.log("No venues found in the table. Please confirm your database table name is 'venues'. Job complete.");
             return;
        }

        for (const venue of venuesToTag) {
            await processVenueForTags(venue);
        }

        console.log("Full re-tagging job complete.");
    } catch (error) {
        console.error("Fatal error during job setup:", error);
    } finally {
        setTimeout(() => db.close(), 5000); 
    }
})();
