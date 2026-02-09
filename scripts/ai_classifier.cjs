const fs = require('fs');
const axios = require('axios');

const OPENAI_KEY = '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';
const MODEL = 'gpt-4o-mini';
const BATCH_SIZE = 5;
const DELAY = 500;

// INSTANT KILL — chains, counter service, concert venues, diners
const CHAIN_KILLS = [
  'red lobster', 'bubba gump', 'shake shack', 'nathan\'s famous', 'bertucci',
  'fogo de chao', 'hook & reel', 'olive garden', 'applebee', 'ihop',
  'denny', 'tgi friday', 'chili\'s', 'outback steakhouse', 'cheesecake factory',
  'p.f. chang', 'buffalo wild wings', 'chipotle', 'five guys', 'wingstop',
  'sweetgreen', 'panera', 'cosi', 'au bon pain', 'pret a manger',
  'dunkin', 'starbucks', 'mcdonald', 'burger king', 'wendy', 'popeyes',
  'kfc', 'taco bell', 'domino', 'papa john', 'little caesars',
  'joe\'s pizza', 'ny pizza suprema', 'grimaldi', 'pizza hut',
  'carnegie hall', 'beacon theatre', 'radio city', 'msg', 'barclays center',
  'tops diner', 'andrews nyc diner',
  'hibachi 2 u', 'hibachi to u',
  'los tacos no', 'burger joint',
  'bill\'s bar & burger', '5 napkin burger',
  'red robin', 'bob evans', 'waffle house', 'cracker barrel',
  'panda express', 'raising cane', 'chick-fil-a', 'el pollo loco',
  'sonic drive', 'jack in the box', 'white castle', 'checkers',
  'jersey mike', 'jimmy john', 'firehouse sub', 'quiznos',
];

function isChainKill(name) {
  const low = name.toLowerCase();
  for (const chain of CHAIN_KILLS) {
    if (low.includes(chain)) return chain;
  }
  return null;
}

const SYSTEM_PROMPT = `You are the AI curator for Lumina, a PREMIUM nightlife and dining discovery app. Your job is to decide if venues belong on Lumina and classify them correctly.

LUMINA STANDARD — These are examples of venues that DEFINE the Lumina experience:

NIGHTLIFE ANCHORS:
- Mira NYC: Upscale afrobeats/r&b lounge, bottle service, beautiful crowd, premium aesthetic
- Amber Room: Trendy cocktail lounge, intimate vibes, date night energy
- Saint NYC: High-energy nightlife, fashion-forward crowd, cultural hub
- Native Lounge: Afrobeats/caribbean nightlife, authentic culture, electric energy  
- Lagos NYC: Afrobeats dining + nightlife crossover, cultural experience
- Blue Note: Legendary jazz club, intimate, world-class performances

DINING ANCHORS:
- DaSylvia's: Upscale soul food, beautiful interior, date night worthy
- Tatiana by Kwame: Chef-driven, aesthetic, cultural dining experience
- Red Rooster Harlem: Premium soul food, great ambiance, celebrity chef
- Zuma: High-end Japanese, stunning interior, premium experience
- Cornbread Brooklyn: Elevated comfort food, great aesthetic, neighborhood gem
- STK Steakhouse: Upscale steakhouse + lounge vibe, date night
- Peter Luger: Legendary steakhouse, iconic experience
- Keens Steakhouse: Classic premium steakhouse
- Buddakan: Dramatic Asian fusion, stunning interior, date night
- OBAO: Stylish Thai/Vietnamese fusion, great ambiance
- Cantina Rooftop: Latin-inspired, rooftop vibes, great energy

KILL ON SIGHT — These do NOT belong on Lumina:
- Chain restaurants (Red Lobster, Olive Garden, Applebees, Shake Shack, etc.)
- Fast food / fast casual (Chipotle, Five Guys, Sweetgreen, Panera, etc.)
- Counter service / pizza-by-slice spots (Joe's Pizza, Grimaldi's, etc.)
- Diners and diner-style restaurants
- Concert venues / arenas (Carnegie Hall, Beacon Theatre, MSG)
- Food courts, cafeterias, buffets
- Catering companies, mobile hibachi, food trucks
- Generic burger joints, wing spots
- Takeout-only / delivery-only spots
- Low-effort aesthetic, plastic chairs, fluorescent lighting vibes

WHAT MAKES A VENUE LUMINA-WORTHY:
- Intentional aesthetic / interior design
- Quality dining or nightlife EXPERIENCE (not just food)
- A place you'd feel good bringing a date, friends, or colleagues
- Has a "vibe" — not just functional eating
- Professional presentation (good photos, website, social media presence)
- Could be featured in a lifestyle magazine or Instagram page

CLASSIFICATION RULES:
- steakhouse = steakhouse (not seafood, not american, not mediterranean)
- French restaurants = american or fusion (we don't have a french world)
- Pizza restaurants (sit-down, brick oven, upscale) = italian
- Pizza-by-slice / counter = KILL
- Ramen shops (sit-down, quality) = japanese
- Concert venues / theaters = KILL
- Rooftop bars with food = classify by dominant cuisine or nightlife world
- If a venue crosses dining + nightlife, classify by what it's KNOWN for`;

async function classifyVenue(venue) {
  const reviewText = (venue.top_reviews || []).map(r => r.text).join(' | ').slice(0, 600);
  
  const prompt = `Classify this venue:

Name: ${venue.name}
Address: ${venue.address || 'N/A'}
City: ${venue.city}
Rating: ${venue.rating} (${venue.reviews_count} reviews)
Google Types: ${(venue.google_types || []).join(', ')}
Price Level: ${venue.price_level || 'N/A'}
Services: dine_in=${venue.services?.dine_in}, reservable=${venue.services?.reservable}, brunch=${venue.services?.brunch}, dinner=${venue.services?.dinner}, beer=${venue.services?.beer}, wine=${venue.services?.wine}
Editorial: ${venue.editorial_summary || 'N/A'}
Photos: ${venue.photo_count || 0}
Website: ${venue.website ? 'Yes' : 'No'}
Current world_hint: ${venue.world_hint}
Reviews: ${reviewText || 'N/A'}

Respond ONLY in this exact JSON:
{"worthy": true/false, "kill_reason": "reason or null", "world": "correct_world", "vibes": ["vibe1","vibe2"], "energy": 7, "price_tier": "moderate/upscale/premium/budget", "scene_candidate": "afrobeats/latin/hiphop/house/jazz/mixed/none", "confidence": 0.85}

Valid worlds: outside, latin_nights, pulse, low_light, soul_food, caribbean, italian, mexican, latin_american, indian, korean, thai, japanese, chinese, seafood, mediterranean, american, fusion, steakhouse
Valid vibes: upscale, trendy, casual, romantic, lively, intimate, cultural, family, date_night, group_friendly, late_night, brunch_spot, rooftop, waterfront, hidden_gem`;

  try {
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.15,
      max_tokens: 200,
    }, {
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    });

    const text = res.data.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error(`  ❌ AI error for ${venue.name}: ${e.message}`);
    return null;
  }
}

async function run() {
  console.log('LUMINA AI CLASSIFIER v2 — With Anchor Standards\n');

  // Load all venues
  const allVenues = [];
  const files = fs.readdirSync('/opt/viberyte/lumina-web/data/')
    .filter(f => f.startsWith('scrape_') && f.endsWith('.json'));
  
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(`/opt/viberyte/lumina-web/data/${f}`, 'utf8'));
    allVenues.push(...data);
    console.log(`  Loaded ${data.length} from ${f}`);
  }
  console.log(`\nTotal: ${allVenues.length} venues to classify\n`);

  let kept = 0, killed = 0, chainKilled = 0, errors = 0, worldChanges = 0;
  const classified = [];
  const killedVenues = [];

  for (let i = 0; i < allVenues.length; i++) {
    const v = allVenues[i];
    const label = `[${i+1}/${allVenues.length}] ${v.name.padEnd(42).slice(0,42)}`;

    // INSTANT CHAIN KILL — no API call needed
    const chainMatch = isChainKill(v.name);
    if (chainMatch) {
      chainKilled++;
      console.log(`${label} 🚫 CHAIN KILL: ${chainMatch}`);
      killedVenues.push({ name: v.name, city: v.city, reason: `chain: ${chainMatch}`, world_hint: v.world_hint });
      continue;
    }

    // AI CLASSIFICATION
    process.stdout.write(`${label} `);
    const result = await classifyVenue(v);

    if (!result) {
      errors++;
      console.log('⚠️ ERROR — keeping as-is');
      classified.push({ ...v, ai_classified: false });
      continue;
    }

    if (!result.worthy) {
      killed++;
      console.log(`❌ KILLED: ${result.kill_reason}`);
      killedVenues.push({ name: v.name, city: v.city, reason: result.kill_reason, world_hint: v.world_hint });
      continue;
    }

    const worldChanged = result.world !== v.world_hint;
    if (worldChanged) worldChanges++;

    kept++;
    console.log(`✅ ${result.world}${worldChanged ? ` (was ${v.world_hint})` : ''} | ${result.vibes.join(', ')} | energy:${result.energy} | ${result.price_tier}`);

    classified.push({
      ...v,
      ai_classified: true,
      ai_world: result.world,
      ai_vibes: result.vibes,
      ai_energy: result.energy,
      ai_price_tier: result.price_tier,
      ai_scene_candidate: result.scene_candidate,
      ai_confidence: result.confidence,
      ai_worthy: true,
      world_changed: worldChanged,
    });

    if ((i + 1) % BATCH_SIZE === 0) {
      await new Promise(r => setTimeout(r, DELAY));
    }
  }

  // Save
  fs.writeFileSync('/opt/viberyte/lumina-web/data/ai_classified.json', JSON.stringify(classified, null, 2));
  fs.writeFileSync('/opt/viberyte/lumina-web/data/ai_killed.json', JSON.stringify(killedVenues, null, 2));

  const cost = (allVenues.length - chainKilled) * 0.0004;

  console.log(`\n${'='.repeat(50)}`);
  console.log('  AI CLASSIFICATION COMPLETE');
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Kept: ${kept}`);
  console.log(`🚫 Chain killed: ${chainKilled} (no API cost)`);
  console.log(`❌ AI killed: ${killed}`);
  console.log(`⚠️ Errors: ${errors}`);
  console.log(`🔄 World corrections: ${worldChanges}`);
  console.log(`💰 Est cost: ~$${cost.toFixed(2)}`);
  console.log(`\nSaved: data/ai_classified.json (${kept} venues)`);
  console.log(`Saved: data/ai_killed.json (${killed + chainKilled} venues)`);

  const wc = {};
  classified.forEach(v => {
    const w = v.ai_world || v.world_hint;
    wc[w] = (wc[w] || 0) + 1;
  });
  console.log('\nBy world:');
  Object.entries(wc).sort((a,b) => b[1]-a[1]).forEach(([w,c]) => console.log(`  ${w}: ${c}`));
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
