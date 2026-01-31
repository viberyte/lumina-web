import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db';
const INSTAGRAM_DIR = '/mnt/HC_Volume_104366905/lumina-media/instagram';
const OPENAI_API_KEY = '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';
const VISION_MODEL = 'gpt-4o';

const db = new Database(DB_PATH);

function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

function extractJSON(text) {
  // Try to find JSON in markdown code blocks first
  let match = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  if (match) return match[1];
  
  // Try to find JSON without markdown
  match = text.match(/\{[\s\S]*\}/);
  if (match) return match[0];
  
  // If no match, return the text as-is and let JSON.parse fail with a better error
  return text;
}

async function analyzeVenueIntelligence(venue, mediaFiles) {
  const sampleImages = mediaFiles.slice(0, 10).map(file => ({
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${imageToBase64(file)}`,
      detail: "low"
    }
  }));

  const prompt = `Analyze this nightlife venue from ${sampleImages.length} photos.

Venue: ${venue.name}
Location: ${venue.city}

Output ONLY valid JSON (no markdown, no explanation):

{
  "day_scores": {
    "mon": {"mode":"lounge", "energy":0.35, "crowd":0.30, "confidence":0.6},
    "tue": {"mode":"lounge", "energy":0.40, "crowd":0.38, "confidence":0.6},
    "wed": {"mode":"lounge", "energy":0.55, "crowd":0.50, "confidence":0.7},
    "thu": {"mode":"clubby", "energy":0.70, "crowd":0.68, "confidence":0.7},
    "fri": {"mode":"club", "energy":0.92, "crowd":0.90, "confidence":0.9},
    "sat": {"mode":"club", "energy":0.96, "crowd":0.94, "confidence":0.9},
    "sun": {"mode":"lounge", "energy":0.50, "crowd":0.45, "confidence":0.6}
  },
  "features": {
    "hookah": {"has":false, "confidence":0.8, "evidence":[]},
    "rooftop": {"has":false, "confidence":0.7},
    "dj_booth": {"has":true, "confidence":0.8},
    "dance_floor": {"has":true, "confidence":0.8},
    "bottle_service": {"has":true, "confidence":0.7},
    "vip_section": {"has":false, "confidence":0.7}
  },
  "drinks": {
    "top_drinks": [
      {"name":"Margarita", "category":"cocktail", "confidence":0.7, "mentions":20}
    ],
    "confidence": 0.7,
    "sample_size": 50
  },
  "crowd": {
    "dominant_age_band": "25-34",
    "gender_balance": "balanced",
    "dress_level": "smart-casual",
    "group_mode": "groups-heavy",
    "solo_friendliness": "medium",
    "confidence": 0.8
  },
  "scene_classification": {
    "primary_scene": "lounge",
    "dress_code": "smart-casual",
    "price_tier": "$$",
    "confidence": 0.8
  }
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a nightlife intelligence analyzer. Always respond with ONLY valid JSON, no markdown formatting, no explanations."
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...sampleImages
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API error: ${data.error?.message || JSON.stringify(data)}`);
    }

    const analysisText = data.choices[0].message.content;
    const jsonText = extractJSON(analysisText);
    
    return JSON.parse(jsonText);
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return null;
  }
}

function saveIntelligence(venueId, intelligence) {
  const saveDb = new Database(DB_PATH);
  
  try {
    if (intelligence.day_scores) {
      const stmt = saveDb.prepare(`
        INSERT OR REPLACE INTO venue_night_profile 
        (venue_id, day_of_week, mode, energy_score, crowd_score, confidence, sample_size, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      for (const [dow, data] of Object.entries(intelligence.day_scores)) {
        stmt.run(venueId, dow, data.mode, data.energy, data.crowd, data.confidence, 10);
      }
    }
    
    if (intelligence.features) {
      const stmt = saveDb.prepare(`
        INSERT OR REPLACE INTO venue_features
        (venue_id, feature_type, has_feature, confidence, evidence, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);
      
      for (const [feature, data] of Object.entries(intelligence.features)) {
        stmt.run(
          venueId, feature, data.has ? 1 : 0,
          data.confidence,
          JSON.stringify(data.evidence || [])
        );
      }
      
      if (intelligence.features.hookah) {
        saveDb.prepare(`UPDATE venues SET has_hookah = ?, hookah_confidence = ? WHERE id = ?`)
          .run(intelligence.features.hookah.has ? 1 : 0, intelligence.features.hookah.confidence, venueId);
      }
    }
    
    if (intelligence.crowd) {
      saveDb.prepare(`
        INSERT OR REPLACE INTO venue_crowd_profile
        (venue_id, dominant_age_band, gender_balance, dress_level, group_mode, solo_friendliness, confidence, sample_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        venueId, intelligence.crowd.dominant_age_band, intelligence.crowd.gender_balance,
        intelligence.crowd.dress_level, intelligence.crowd.group_mode, intelligence.crowd.solo_friendliness,
        intelligence.crowd.confidence, 10
      );
    }
    
    if (intelligence.scene_classification) {
      saveDb.prepare(`UPDATE venues SET primary_scene = ?, dress_code = ?, price_tier = ?, last_insights_refresh = datetime('now') WHERE id = ?`)
        .run(intelligence.scene_classification.primary_scene, intelligence.scene_classification.dress_code, 
             intelligence.scene_classification.price_tier, venueId);
    }
    
  } finally {
    saveDb.close();
  }
}

async function processVenues(limit = 5) {
  console.log('🧠 Venue Intelligence Extraction\n');
  
  const venues = db.prepare(`
    SELECT id, name, city, neighborhood, category
    FROM venues
    WHERE last_insights_refresh IS NULL
    LIMIT ?
  `).all(limit);
  
  console.log(`Found ${venues.length} venues\n`);
  
  let processed = 0;
  
  for (const venue of venues) {
    console.log(`\n🏢 ${venue.name}`);
    
    const igFiles = fs.readdirSync(INSTAGRAM_DIR)
      .filter(f => f.endsWith('.jpg'))
      .slice(0, 10)
      .map(f => path.join(INSTAGRAM_DIR, f));
    
    if (igFiles.length === 0) continue;
    
    console.log(`   📸 ${igFiles.length} images`);
    
    const intelligence = await analyzeVenueIntelligence(venue, igFiles);
    
    if (intelligence) {
      saveIntelligence(venue.id, intelligence);
      processed++;
      console.log(`   ✅ Saved intelligence`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n🎉 Done! Processed: ${processed}`);
  db.close();
}

const limit = parseInt(process.argv[2]) || 5;
processVenues(limit);
