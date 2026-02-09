const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

const VALID_LENSES = [
  // Vibe lenses (nightlife)
  'OUTSIDE', 'LATIN_NIGHTS', 'PULSE', 'MAIN_STAGE', 'LOW_LIGHT',
  // Cuisine lenses (dining)
  'italian', 'japanese', 'chinese', 'korean', 'thai', 'indian', 
  'mexican', 'mediterranean', 'caribbean', 'soul_food', 'seafood', 
  'steakhouse', 'american', 'french', 'latin_american', 'fusion',
  'vegan', 'african',
  // Exclude
  'EXCLUDE'
];

const VALID_TAGS = ['vegan', 'vegetarian', 'fusion', 'brunch', 'late_night', 'date_night', 'group_friendly', 'upscale', 'casual', 'rooftop', 'live_music', 'hookah', 'afrobeats'];

const LENS_ALIASES = {
  'new american': 'american',
  'vietnamese': 'thai',
  'asian': 'fusion',
  'asian fusion': 'fusion',
  'spanish': 'latin_american',
  'peruvian': 'latin_american',
  'colombian': 'latin_american',
  'brazilian': 'latin_american',
  'greek': 'mediterranean',
  'turkish': 'mediterranean',
  'lebanese': 'mediterranean',
  'middle eastern': 'mediterranean',
  'jamaican': 'caribbean',
  'haitian': 'caribbean',
  'southern': 'soul_food',
  'sushi': 'japanese',
  'ramen': 'japanese',
  'bbq': 'american',
  'burger': 'american',
  'pizza': 'italian',
  'tacos': 'mexican',
  'tex-mex': 'mexican',
  'pakistani': 'indian',
  'afghan': 'indian',
  'dim sum': 'chinese',
  'cantonese': 'chinese',
  'plant-based': 'vegan',
  'vegetarian': 'vegan',
  // African cuisines
  'ethiopian': 'african',
  'nigerian': 'african',
  'ghanaian': 'african',
  'senegalese': 'african',
  'somali': 'african',
  'kenyan': 'african',
  'swahili': 'african',
  'west african': 'african',
  'east african': 'african',
  'north african': 'african',
  'moroccan': 'african',
  'south african': 'african',
  // Exclude
  'cafe': 'EXCLUDE',
  'coffee': 'EXCLUDE',
  'bakery': 'EXCLUDE',
  'deli': 'EXCLUDE',
  'food truck': 'EXCLUDE',
  'fast food': 'EXCLUDE',
};

function normalizeLens(lens) {
  if (!lens) return null;
  const lower = lens.toLowerCase().trim();
  
  if (VALID_LENSES.includes(lens)) return lens;
  if (VALID_LENSES.includes(lower)) return lower;
  if (LENS_ALIASES[lower]) return LENS_ALIASES[lower];
  
  for (const [alias, target] of Object.entries(LENS_ALIASES)) {
    if (lower.includes(alias)) return target;
  }
  
  return null;
}

async function callAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  const data = await response.json();
  if (data.error) {
    console.error('API Error:', data.error.message);
    return null;
  }
  return data.choices?.[0]?.message?.content || null;
}

async function classifyBatch(venues) {
  const prompt = `Classify venues for Lumina nightlife/dining app.

RETURN FORMAT - JSON array:
[{"id":123,"lens":"italian","tags":["date_night"]},{"id":456,"lens":"african","tags":["afrobeats","hookah"]}]

PRIMARY LENS (pick ONE):
NIGHTLIFE: 
- OUTSIDE (hip-hop/R&B/afrobeats lounges & clubs, hookah spots, Black-owned nightlife)
- LATIN_NIGHTS (reggaeton/salsa/bachata clubs)
- PULSE (EDM/techno/house clubs)
- MAIN_STAGE (pop/top-40/live music venues)
- LOW_LIGHT (speakeasies/jazz/wine/cocktail bars)

DINING:
- italian, japanese, chinese, korean, thai, indian, mexican, mediterranean
- caribbean, soul_food, seafood, steakhouse, american, french, latin_american
- fusion, vegan, african

EXCLUDE: chains, fast food, cafes, food trucks, museums, bakeries

TAGS (pick any that apply):
vegan, vegetarian, fusion, brunch, late_night, date_night, group_friendly, upscale, casual, rooftop, live_music, hookah, afrobeats

IMPORTANT RULES:
- African restaurants (Ethiopian, Nigerian, Ghanaian, Swahili, etc.) → lens: "african"
- African LOUNGE/BAR with afrobeats music → lens: "OUTSIDE", tags: ["afrobeats", "african"]
- Swahili Village (lounge/bar) → lens: "OUTSIDE", tags: ["african", "afrobeats"]
- Vegan restaurants → lens: "vegan", tag with cuisine style
- Fusion restaurants → lens: "fusion", tag the cuisines involved
- Hookah lounges → lens: "OUTSIDE", tags: ["hookah"]
- Latin RESTAURANTS → lens: "latin_american"
- Latin CLUBS → lens: "LATIN_NIGHTS"

VENUES:
${venues.map(v => `${v.id}|"${v.name}"|${v.category}|cuisine:${v.cuisine_primary || 'N/A'}|${v.city}`).join('\n')}

Return ONLY valid JSON array:`;

  const response = await callAI(prompt);
  if (!response) return [];

  let results = [];
  try {
    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      results = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('  Parse error, extracting manually...');
    const matches = response.matchAll(/\{"id"\s*:\s*(\d+)\s*,\s*"lens"\s*:\s*"([^"]+)"[^}]*\}/g);
    for (const match of matches) {
      results.push({ id: parseInt(match[1]), lens: match[2], tags: [] });
    }
  }

  return results;
}

async function main() {
  // Add secondary_lens column if needed
  try {
    db.exec(`ALTER TABLE venues ADD COLUMN secondary_lens TEXT`);
    console.log('Added secondary_lens column');
  } catch (e) {}

  const blanks = db.prepare(`
    SELECT id, name, category, cuisine_primary, city, lounge_type
    FROM venues 
    WHERE (primary_lens IS NULL OR primary_lens = '')
      AND should_exclude = 0
    ORDER BY id
  `).all();

  console.log(`Found ${blanks.length} blank venues to classify\n`);

  if (blanks.length === 0) {
    console.log('No blanks to process!');
    db.close();
    return;
  }

  const BATCH_SIZE = 30;
  const updateStmt = db.prepare(`UPDATE venues SET primary_lens = ?, secondary_lens = ? WHERE id = ?`);
  const excludeStmt = db.prepare(`UPDATE venues SET should_exclude = 1, explore_ready = 0 WHERE id = ?`);

  let totalAssigned = 0;
  let totalExcluded = 0;

  for (let i = 0; i < blanks.length; i += BATCH_SIZE) {
    const batch = blanks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i/BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(blanks.length/BATCH_SIZE);
    console.log(`[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} venues...`);

    try {
      const results = await classifyBatch(batch);
      
      let batchAssigned = 0, batchExcluded = 0;
      
      results.forEach(r => {
        let lens = normalizeLens(r.lens);
        const tags = Array.isArray(r.tags) ? r.tags.filter(t => VALID_TAGS.includes(t)) : [];
        
        if (!lens) {
          const venue = batch.find(v => v.id === r.id);
          if (venue?.cuisine_primary) {
            lens = normalizeLens(venue.cuisine_primary);
          }
          if (!lens) {
            lens = 'american';
            console.log(`  ⚠ Defaulted "${venue?.name}" to american`);
          }
        }
        
        if (lens === 'EXCLUDE') {
          excludeStmt.run(r.id);
          totalExcluded++;
          batchExcluded++;
        } else {
          const tagsJson = tags.length > 0 ? JSON.stringify(tags) : null;
          updateStmt.run(lens, tagsJson, r.id);
          totalAssigned++;
          batchAssigned++;
          
          if (tags.length > 0) {
            const venue = batch.find(v => v.id === r.id);
            console.log(`  ✓ "${venue?.name}" → ${lens} [${tags.join(', ')}]`);
          }
        }
      });

      // Handle missing venues
      const resultIds = new Set(results.map(r => r.id));
      batch.forEach(v => {
        if (!resultIds.has(v.id)) {
          let lens = normalizeLens(v.cuisine_primary) || 'american';
          updateStmt.run(lens, null, v.id);
          totalAssigned++;
          batchAssigned++;
        }
      });

      console.log(`  ✓ Done: ${batchAssigned} assigned, ${batchExcluded} excluded`);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
    } catch (e) {
      console.error(`  ✗ Error:`, e.message);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`FINAL RESULTS`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Assigned: ${totalAssigned}`);
  console.log(`Excluded: ${totalExcluded}`);

  const counts = db.prepare(`
    SELECT primary_lens, COUNT(*) as count 
    FROM venues 
    WHERE explore_ready = 1
    GROUP BY primary_lens 
    ORDER BY count DESC
  `).all();

  console.log(`\n--- Primary Lens Counts ---`);
  counts.forEach(r => console.log(`  ${r.primary_lens || '(blank)'}: ${r.count}`));

  const tagged = db.prepare(`
    SELECT COUNT(*) as count FROM venues 
    WHERE secondary_lens IS NOT NULL AND explore_ready = 1
  `).get();
  console.log(`\nVenues with tags: ${tagged.count}`);

  const remaining = db.prepare(`
    SELECT COUNT(*) as count FROM venues 
    WHERE (primary_lens IS NULL OR primary_lens = '') AND explore_ready = 1
  `).get();
  console.log(`Remaining blanks: ${remaining.count}`);

  db.close();
  console.log('\n✅ Done!');
}

main().catch(console.error);
