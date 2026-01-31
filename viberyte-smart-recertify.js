/**
 * SMART RE-CERTIFICATION
 * 
 * Uses both OpenAI (visual analysis) + Claude (cultural context)
 * Learns to distinguish: authentic cultural spots vs generic tourist traps
 */

import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const anthropic = new Anthropic({ 
  apiKey: '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'
});
const openai = new OpenAI({
  apiKey: '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'
});

console.log('🎯 SMART RE-CERTIFICATION WITH EXAMPLES\n');

const venues = db.prepare(`
  SELECT id, name, city, neighborhood, category, cuisine,
         google_rating, yelp_rating, yelp_review_count,
         professional_photos, certification_reasoning, viberyte_score
  FROM venues 
  WHERE viberyte_score >= 6 
    AND viberyte_score < 8
    AND state IN ('NY', 'NJ')
  ORDER BY viberyte_score DESC
`).all();

console.log(`Re-evaluating ${venues.length} venues\n`);

const updateStmt = db.prepare(`
  UPDATE venues SET
    viberyte_score = ?,
    viberyte_certified = ?,
    certification_reasoning = ?,
    should_exclude = ?
  WHERE id = ?
`);

let upgraded = 0;
let downgraded = 0;

for (let i = 0; i < venues.length; i++) {
  const venue = venues[i];
  
  console.log(`\n━━━ [${i + 1}/${venues.length}] ${venue.name} ━━━`);
  console.log(`  ${venue.city}${venue.neighborhood ? ', ' + venue.neighborhood : ''}`);
  console.log(`  Current: ${venue.viberyte_score}/10`);
  
  try {
    // Step 1: OpenAI visual analysis (if photos exist)
    let visualAnalysis = 'No photos available';
    
    if (venue.professional_photos) {
      const photos = JSON.parse(venue.professional_photos);
      if (photos.length > 0) {
        console.log('  👁️  Analyzing photos...');
        
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Analyze these venue photos. Look for:
- AUTHENTIC cultural details (art, decor, staff)
- TRENDY appeal (Instagram-worthy, modern design)
- ENERGY level (lively vs dead)
- GENERIC warning signs (chain vibes, food court aesthetic, basic hookah setup)

Rate AUTHENTICITY (1-10) and ENERGY (1-10).` 
              },
              ...photos.slice(0, 3).map(photo => ({
                type: "image_url",
                image_url: { url: photo }
              }))
            ]
          }],
          max_tokens: 200
        });
        
        visualAnalysis = visionResponse.choices[0].message.content;
        console.log(`  ✅ Photos analyzed`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Step 2: Claude cultural evaluation
    console.log('  🤖 Cultural evaluation...');
    
    const culturalPrompt = `SMART VENUE RE-EVALUATION

VENUE: ${venue.name}
LOCATION: ${venue.neighborhood || venue.city}
CUISINE: ${venue.cuisine || 'N/A'}
RATINGS: Google ${venue.google_rating}⭐ | Yelp ${venue.yelp_rating}⭐ (${venue.yelp_review_count} reviews)

PHOTO ANALYSIS:
${visualAnalysis}

ORIGINAL SCORE: ${venue.viberyte_score}/10
ORIGINAL REASONING: ${venue.certification_reasoning}

━━━ LEARN FROM THESE EXAMPLES ━━━

✅ UPGRADE TO 8+ (Keep these types):
- "Djon Djon" → Authentic Caribbean fine dining, cultural destination
- "Simpson Restaurant & Bar" → Caribbean spot, community gathering place
- "Elite Williamsburg" → Trendy young crowd, urban hip spot
- "Forma Pasta" → Quality quick Italian, locals love it
- "Karan Thai" → Authentic Thai, casual but excellent
- "The Acoustic Garden" → Rooftop lounge with character, trendy casual
- "Vida NYC" → Queens trendy spot, neighborhood gem

❌ EXCLUDE (Downgrade these types):
- "Boogie Down Food Hall" → Generic food court, no soul
- "Brooklyn Chicken & Waffles" → Tourist trap, overhyped
- "The Best Hookah Place" → Basic hookah lounge, nothing special
- "Pizza Do Roma" → Generic pizza, chain vibes

━━━ KEY DISTINCTIONS ━━━

UPGRADE if venue has:
✓ Authentic cultural identity (not generic ethnic food)
✓ Neighborhood status (where locals ACTUALLY go)
✓ Trendy appeal (Gen Z/Millennial buzz)
✓ Unique character (rooftop, garden, live music, art)
✓ Quality quick eats (not upscale, but RELIABLE)

EXCLUDE if venue is:
✗ Food hall/court (unless exceptional)
✗ Generic chain vibes
✗ Tourist trap (overhyped on socials, locals avoid)
✗ Basic hookah lounge (no ambiance differentiation)
✗ Generic ethnic food (just happens to be Thai/Caribbean/etc)

━━━ YOUR DECISION ━━━

NEW_SCORE: [6-10]
ACTION: [UPGRADE/KEEP/DOWNGRADE]
REASONING: [2 sentences - be specific about WHY]`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [{ role: "user", content: culturalPrompt }]
    });
    
    const text = response.content[0].text;
    const lines = text.split('\n');
    
    let newScore = venue.viberyte_score;
    let action = 'KEEP';
    let newReasoning = venue.certification_reasoning;
    
    lines.forEach(line => {
      if (line.startsWith('NEW_SCORE:')) {
        newScore = parseInt(line.replace('NEW_SCORE:', '').trim());
      } else if (line.startsWith('ACTION:')) {
        action = line.replace('ACTION:', '').trim().toUpperCase();
      } else if (line.startsWith('REASONING:')) {
        newReasoning = line.replace('REASONING:', '').trim();
      }
    });
    
    const isCertified = newScore >= 8 ? 1 : 0;
    const shouldExclude = newScore < 6 ? 1 : 0;
    
    if (newScore > venue.viberyte_score) {
      upgraded++;
      console.log(`  ✅ UPGRADED: ${venue.viberyte_score} → ${newScore}/10`);
    } else if (newScore < venue.viberyte_score) {
      downgraded++;
      console.log(`  ❌ DOWNGRADED: ${venue.viberyte_score} → ${newScore}/10`);
    } else {
      console.log(`  ⏸️  UNCHANGED: ${newScore}/10`);
    }
    
    console.log(`  💭 ${newReasoning}`);
    
    updateStmt.run(newScore, isCertified, newReasoning, shouldExclude, venue.id);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
  }
  
  if ((i + 1) % 10 === 0) {
    console.log(`\n━━━ PROGRESS: ${i + 1}/${venues.length} | ⬆️ ${upgraded} | ⬇️ ${downgraded} ━━━\n`);
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`SMART RE-CERTIFICATION COMPLETE`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ Upgraded: ${upgraded}`);
console.log(`❌ Downgraded: ${downgraded}\n`);

const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN viberyte_certified = 1 THEN 1 END) as certified,
    COUNT(CASE WHEN should_exclude = 1 THEN 1 END) as excluded
  FROM venues
  WHERE state IN ('NY', 'NJ')
`).get();

console.log(`📊 FINAL STATS:`);
console.log(`   Total: ${stats.total}`);
console.log(`   Certified: ${stats.certified}`);
console.log(`   Excluded: ${stats.excluded}\n`);

db.close();
