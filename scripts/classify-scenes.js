import Database from 'better-sqlite3';
import OpenAI from 'openai';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: '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' });

const SCENES = ['afrobeats', 'latin', 'hiphop', 'house', 'edm', 'mixed', 'none'];

async function classifyScenes() {
  // First: HARD-BLOCK all restaurants to 'none'
  const restaurantResult = db.prepare(`
    UPDATE venues 
    SET primary_scene = 'none', music_confidence = 0
    WHERE primary_category = 'restaurant'
    AND (primary_scene IS NULL OR primary_scene = '' OR primary_scene = 'lounge')
  `).run();
  console.log(`🍽️  Set ${restaurantResult.changes} restaurants to scene='none'\n`);

  // Also set museums to 'none'
  db.prepare(`
    UPDATE venues 
    SET primary_scene = 'none', music_confidence = 0
    WHERE primary_category = 'museum'
  `).run();

  // Get nightlife venues that need scene classification
  const venues = db.prepare(`
    SELECT id, name, primary_category, music_genres, vibe_tags, description
    FROM venues 
    WHERE primary_category IN ('club', 'lounge', 'bar')
    AND (primary_scene IS NULL OR primary_scene = '' OR primary_scene = 'lounge')
    ORDER BY id
    LIMIT 150
  `).all();
  
  console.log(`Classifying ${venues.length} nightlife venues...\n`);
  
  let updated = 0;
  
  for (const venue of venues) {
    try {
      const response = await openai.chat.completions.create({
        model: 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2',
        messages: [{
          role: 'system',
          content: `You classify nightlife venues by their PRIMARY cultural scene.
          
A venue's scene is what it's KNOWN FOR most nights - its cultural identity.

SCENES:
- afrobeats: African/Caribbean music culture (afrobeats, amapiano, dancehall, soca)
- latin: Latin music culture (reggaeton, salsa, bachata, Latin house)
- hiphop: Hip-hop/R&B culture (hip-hop, R&B, trap)
- house: House/techno culture (house, tech house, deep house, techno)
- edm: EDM/mainstream electronic (EDM, top-40, commercial dance)
- mixed: Multi-genre venue with no dominant scene
- none: No clear music identity

Return ONLY JSON: {"scene": "xxx", "confidence": 0.0-1.0}

Rules:
- If venue plays multiple genres equally → "mixed"
- If confidence < 0.5 → use "mixed" or "none"
- Be conservative - only high confidence for venues KNOWN for that scene`
        }, {
          role: 'user', 
          content: `Venue: ${venue.name}
Category: ${venue.primary_category}
Music genres: ${venue.music_genres || 'unknown'}
Vibe: ${venue.vibe_tags || 'unknown'}`
        }],
        temperature: 0.2
      });
      
      const content = response.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const scene = SCENES.includes(data.scene) ? data.scene : 'mixed';
        const confidence = Math.min(1, Math.max(0, data.confidence || 0.5));
        
        // Only update if not already properly classified
        db.prepare(`
          UPDATE venues 
          SET primary_scene = ?, music_confidence = ?
          WHERE id = ?
          AND (primary_scene IS NULL OR primary_scene = '' OR primary_scene = 'lounge')
        `).run(scene, confidence, venue.id);
        
        const emoji = scene === 'afrobeats' ? '🌍' : 
                      scene === 'latin' ? '💃' : 
                      scene === 'hiphop' ? '🎤' : 
                      scene === 'house' ? '🎧' : 
                      scene === 'edm' ? '⚡' : 
                      scene === 'mixed' ? '🎵' : '⬜';
        
        console.log(`${emoji} ${venue.name}: ${scene} (${(confidence * 100).toFixed(0)}%)`);
        updated++;
      }
    } catch (err) {
      console.log(`❌ ${venue.name}: ${err.message}`);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n=== Done! Classified ${updated} venues ===`);
  
  // Show summary
  const summary = db.prepare(`
    SELECT primary_scene, COUNT(*) as count 
    FROM venues 
    GROUP BY primary_scene 
    ORDER BY count DESC
  `).all();
  console.log('\n=== SCENE SUMMARY ===');
  summary.forEach(s => console.log(`${s.primary_scene || 'NULL'}: ${s.count}`));
}

classifyScenes().catch(console.error);
