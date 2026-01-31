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

// Map AI age bands to database format
function normalizeAgeBand(ageBand) {
  if (!ageBand) return '25-34';
  
  const normalized = ageBand.toLowerCase().replace(/\s/g, '');
  
  if (normalized.includes('21') || normalized.includes('18-24')) return '18-24';
  if (normalized.includes('25') || normalized.includes('25-29') || normalized.includes('25-34')) return '25-34';
  if (normalized.includes('30') || normalized.includes('35') || normalized.includes('30-37') || normalized.includes('35-44')) return '35-44';
  if (normalized.includes('38') || normalized.includes('45') || normalized.includes('38+') || normalized.includes('45+')) return '45+';
  
  return '25-34'; // default
}

async function analyzeAgeAndVibe(venue, imageFiles) {
  const sampleImages = imageFiles.slice(0, 10).map(file => ({
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${imageToBase64(file)}`,
      detail: "low"
    }
  }));

  const prompt = `Analyze this nightlife venue's crowd from ${sampleImages.length} photos.

CRITICAL: Detect actual ages accurately. This determines venue recommendations for different age groups.

Age indicators to look for:
- Facial features (wrinkles, skin texture, gray hair)
- Fashion (Gen Z trends vs millennial vs mature style)
- Body language and posture
- Drink types in hands
- Group dynamics

Return ONLY this JSON:

{
  "age_breakdown": {
    "young_18_24_percent": 15,
    "mid_25_34_percent": 35,
    "mature_35_44_percent": 40,
    "older_45_plus_percent": 10,
    "dominant_band": "35-44",
    "confidence": 0.85
  },
  "vibe_markers": {
    "is_young_party_crowd": false,
    "is_mature_sophisticated": true,
    "energy_level": 6,
    "dress_level": "upscale",
    "conversation_vs_dancing": "conversation-heavy"
  },
  "features": {
    "hookah": false,
    "rooftop": true,
    "bottle_service": true,
    "dj_booth": false
  },
  "scene_classification": {
    "primary": "lounge",
    "lounge_score": 8,
    "club_score": 3,
    "restaurant_score": 5
  },
  "recommendation_fit": {
    "best_for_ages": ["35-44", "45+"],
    "avoid_if_age": ["18-24"],
    "occasion": ["date_night", "business_casual", "mature_groups"]
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
            content: "You are a nightlife demographics expert. Focus on accurate age detection. Return only JSON."
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...sampleImages
            ]
          }
        ],
        max_tokens: 1200,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API error: ${data.error?.message}`);
    }

    return JSON.parse(data.choices[0].message.content);
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return null;
  }
}

function saveAgeIntelligence(venueId, intelligence) {
  const saveDb = new Database(DB_PATH);
  
  try {
    const ageData = intelligence.age_breakdown || {};
    const vibeData = intelligence.vibe_markers || {};
    
    // Normalize age band to database format
    const normalizedAgeBand = normalizeAgeBand(ageData.dominant_band);
    
    saveDb.prepare(`
      INSERT OR REPLACE INTO venue_crowd_profile
      (venue_id, dominant_age_band, gender_balance, dress_level, group_mode, solo_friendliness, confidence, sample_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      venueId,
      normalizedAgeBand,
      'balanced',
      vibeData.dress_level || 'smart-casual',
      vibeData.conversation_vs_dancing === 'conversation-heavy' ? 'couples' : 'groups-heavy',
      'medium',
      ageData.confidence || 0.7,
      10
    );
    
    // Save features
    if (intelligence.features) {
      const featureStmt = saveDb.prepare(`
        INSERT OR REPLACE INTO venue_features
        (venue_id, feature_type, has_feature, confidence, evidence)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const [feature, hasIt] of Object.entries(intelligence.features)) {
        featureStmt.run(venueId, feature, hasIt ? 1 : 0, 0.8, '[]');
      }
      
      // Update hookah in venues table
      if (intelligence.features.hookah !== undefined) {
        saveDb.prepare(`UPDATE venues SET has_hookah = ?, hookah_confidence = ? WHERE id = ?`)
          .run(intelligence.features.hookah ? 1 : 0, 0.8, venueId);
      }
    }
    
    // Save scene classification
    const scene = intelligence.scene_classification?.primary || 'lounge';
    
    saveDb.prepare(`
      UPDATE venues
      SET primary_scene = ?,
          tiktok_data = ?,
          last_insights_refresh = datetime('now')
      WHERE id = ?
    `).run(scene, JSON.stringify(intelligence), venueId);
    
  } finally {
    saveDb.close();
  }
}

async function processVenues(limit = 10) {
  console.log('🎯 AGE-FOCUSED Intelligence Extraction\n');
  
  const venues = db.prepare(`
    SELECT id, name, city, neighborhood, category
    FROM venues
    WHERE last_insights_refresh IS NULL
    LIMIT ?
  `).all(limit);
  
  console.log(`Found ${venues.length} venues\n`);
  
  let processed = 0;
  let totalCost = 0;
  
  for (const venue of venues) {
    console.log(`\n🏢 ${venue.name}`);
    
    const igFiles = fs.readdirSync(INSTAGRAM_DIR)
      .filter(f => f.endsWith('.jpg'))
      .slice(0, 10)
      .map(f => path.join(INSTAGRAM_DIR, f));
    
    if (igFiles.length === 0) {
      console.log('   ⏭️  No images');
      continue;
    }
    
    console.log(`   📸 ${igFiles.length} images`);
    
    const intelligence = await analyzeAgeAndVibe(venue, igFiles);
    
    if (intelligence) {
      saveAgeIntelligence(venue.id, intelligence);
      processed++;
      totalCost += 0.03;
      
      const ageData = intelligence.age_breakdown || {};
      const isMature = (ageData.mature_35_44_percent || 0) + (ageData.older_45_plus_percent || 0) > 40;
      
      console.log(`   ✅ Analyzed`);
      console.log(`      Dominant age: ${ageData.dominant_band} ${isMature ? '🍷 MATURE' : '🎉 YOUNG'}`);
      console.log(`      18-24: ${ageData.young_18_24_percent || 0}%`);
      console.log(`      25-34: ${ageData.mid_25_34_percent || 0}%`);
      console.log(`      35-44: ${ageData.mature_35_44_percent || 0}%`);
      console.log(`      45+: ${ageData.older_45_plus_percent || 0}%`);
      console.log(`      Scene: ${intelligence.scene_classification?.primary || 'unknown'}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n🎉 Complete! Processed: ${processed}, Cost: $${totalCost.toFixed(2)}`);
  db.close();
}

const limit = parseInt(process.argv[2]) || 10;
processVenues(limit);
