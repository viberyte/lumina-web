const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';
const ACTOR_ID = 'apify~google-search-scraper';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

const VALID_LENSES = [
  'OUTSIDE', 'LATIN_NIGHTS', 'PULSE', 'MAIN_STAGE', 'LOW_LIGHT',
  'italian', 'japanese', 'chinese', 'korean', 'thai', 'indian', 
  'mexican', 'mediterranean', 'caribbean', 'soul_food', 'seafood', 
  'steakhouse', 'american', 'french', 'latin_american', 'fusion',
  'vegan', 'african', 'EXCLUDE'
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchGoogle(venues) {
  const queries = venues.map(v => 
    `${v.name} ${v.city} ${v.state || 'NY'} restaurant cuisine type`
  ).join('\n');

  const input = {
    queries: queries,
    maxPagesPerQuery: 1,
    resultsPerPage: 2,
    languageCode: "en",
    mobileResults: false,
  };

  const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await response.json();
  if (data.error) {
    console.error('Apify error:', data.error);
    return [];
  }

  const runId = data.data?.id;
  console.log(`  Google Search run: ${runId}`);

  // Wait for completion
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`);
    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    
    if (status === 'SUCCEEDED') break;
    if (status === 'FAILED' || status === 'ABORTED') {
      console.error('  Run failed:', status);
      return [];
    }
    process.stdout.write('.');
  }
  console.log('');

  const results = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`);
  return results.json();
}

async function classifyWithAI(venues, googleResults) {
  // Build context from Google results
  const context = venues.map((v, i) => {
    const gResult = googleResults[i];
    const snippets = (gResult?.organicResults || [])
      .slice(0, 2)
      .map(r => `${r.title}: ${(r.description || '').substring(0, 150)}`)
      .join(' | ');
    
    return `ID ${v.id}: "${v.name}" in ${v.city}, ${v.state || 'NY'} | Current: ${v.primary_lens} | Google says: ${snippets || 'no results'}`;
  }).join('\n\n');

  const prompt = `Based on REAL Google search results, classify these venues correctly.

VALID CATEGORIES:
NIGHTLIFE: OUTSIDE (hip-hop/R&B/afrobeats/hookah lounges), LATIN_NIGHTS (reggaeton/salsa clubs), PULSE (EDM/techno), MAIN_STAGE (pop/top-40/live music), LOW_LIGHT (speakeasies/jazz/cocktail bars)
DINING: italian, japanese, chinese, korean, thai, indian, mexican, mediterranean, caribbean, soul_food, seafood, steakhouse, american, french, latin_american, fusion, vegan, african
EXCLUDE: chains, fast food, cafes, bakeries, food trucks

IMPORTANT MAPPINGS:
- Taiwanese → chinese
- Argentine/Argentinian → latin_american
- Ethiopian/Nigerian/Ghanaian/Kenyan/East African/West African → african
- Vietnamese/Laotian → thai
- Greek/Turkish/Lebanese/Israeli → mediterranean
- Jamaican/Haitian/Cuban/Puerto Rican → caribbean
- Southern/Cajun → soul_food
- Peruvian/Colombian/Brazilian → latin_american

VENUES WITH GOOGLE DATA:
${context}

Return JSON array with verified classifications:
[{"id": 123, "lens": "correct_category", "confidence": "high/medium/low"}]`;

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
    console.error('OpenAI error:', data.error);
    return [];
  }

  const content = data.choices?.[0]?.message?.content || '[]';
  try {
    const match = content.match(/\[[\s\S]*?\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch (e) {
    console.error('Parse error');
    return [];
  }
}

async function main() {
  // Get venues that need verification (prioritize "american" which may be misclassified)
  const venues = db.prepare(`
    SELECT id, name, city, state, primary_lens, cuisine_primary, category
    FROM venues 
    WHERE explore_ready = 1 
      AND (primary_lens = 'american' OR primary_lens IS NULL OR primary_lens = '')
    ORDER BY id
  `).all();

  console.log(`Found ${venues.length} venues to verify\n`);

  const updateStmt = db.prepare(`UPDATE venues SET primary_lens = ?, google_verified = 1 WHERE id = ?`);
  const excludeStmt = db.prepare(`UPDATE venues SET should_exclude = 1, explore_ready = 0 WHERE id = ?`);

  // Add google_verified column
  try { db.exec(`ALTER TABLE venues ADD COLUMN google_verified INTEGER DEFAULT 0`); } catch {}

  let totalUpdated = 0, totalExcluded = 0, totalKept = 0;
  const BATCH_SIZE = 15; // Keep batches small for Google Search

  for (let i = 0; i < venues.length; i += BATCH_SIZE) {
    const batch = venues.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(venues.length / BATCH_SIZE);
    
    console.log(`[Batch ${batchNum}/${totalBatches}] Verifying ${batch.length} venues...`);

    try {
      // Step 1: Google Search
      const googleResults = await searchGoogle(batch);
      console.log(`  Got ${googleResults.length} Google results`);

      // Step 2: AI Classification with Google context
      const classifications = await classifyWithAI(batch, googleResults);
      console.log(`  Got ${classifications.length} AI classifications`);

      // Step 3: Update database
      for (const c of classifications) {
        if (!VALID_LENSES.includes(c.lens)) continue;

        const venue = batch.find(v => v.id === c.id);
        
        if (c.lens === 'EXCLUDE') {
          excludeStmt.run(c.id);
          totalExcluded++;
          console.log(`    ✗ EXCLUDED: "${venue?.name}"`);
        } else if (c.lens !== venue?.primary_lens) {
          updateStmt.run(c.lens, c.id);
          totalUpdated++;
          console.log(`    ✓ "${venue?.name}": ${venue?.primary_lens} → ${c.lens} (${c.confidence})`);
        } else {
          totalKept++;
        }
      }

      // Rate limit
      await sleep(2000);

    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Updated: ${totalUpdated}`);
  console.log(`Excluded: ${totalExcluded}`);
  console.log(`Kept as-is: ${totalKept}`);

  // Final counts
  const counts = db.prepare(`
    SELECT primary_lens, COUNT(*) as count 
    FROM venues WHERE explore_ready = 1
    GROUP BY primary_lens ORDER BY count DESC
  `).all();

  console.log('\n--- Final Primary Lens Counts ---');
  counts.forEach(r => console.log(`  ${r.primary_lens}: ${r.count}`));

  db.close();
  console.log('\n✅ Done!');
}

main().catch(console.error);
