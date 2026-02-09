const fs = require('fs');
const axios = require('axios');

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = 'gpt-4o-mini';
const BATCH_SIZE = 5;
const DELAY = 500;

const CHAIN_KILLS = [
  'red lobster', 'bubba gump', 'shake shack', 'nathan\'s famous', 'bertucci',
  'fogo de chao', 'hook & reel', 'olive garden', 'applebee', 'ihop',
  'denny', 'tgi friday', 'chili\'s', 'outback steakhouse', 'cheesecake factory',
  'p.f. chang', 'buffalo wild wings', 'chipotle', 'five guys', 'wingstop',
  'sweetgreen', 'panera', 'cosi', 'au bon pain', 'pret a manger',
  'dunkin', 'starbucks', 'mcdonald', 'burger king', 'wendy', 'popeyes',
  'kfc', 'taco bell', 'domino', 'papa john', 'little caesars',
  'pizza hut', 'carnegie hall', 'beacon theatre', 'radio city',
  'barclays center', 'madison square garden',
  'hibachi 2 u', 'hibachi to u',
  'red robin', 'bob evans', 'waffle house', 'cracker barrel',
  'panda express', 'raising cane', 'chick-fil-a', 'el pollo loco',
  'sonic drive', 'jack in the box', 'white castle', 'checkers',
  'jersey mike', 'jimmy john', 'firehouse sub', 'quiznos',
  'subway', 'arby', 'long john silver', 'captain d',
  'golden corral', 'sizzler', 'hometown buffet', 'cicis pizza',
];

function isChainKill(name) {
  const low = name.toLowerCase();
  for (const chain of CHAIN_KILLS) {
    if (low.includes(chain)) return chain;
  }
  return null;
}

const SYSTEM_PROMPT = `You are the AI curator for Lumina, a PREMIUM nightlife and dining discovery app in NYC and NJ. Decide if each venue belongs on Lumina and classify it.

YOUR REFERENCE — These venues define each world's standard. A venue must feel like it BELONGS alongside these:

NIGHTLIFE:

OUTSIDE (Afrobeats / Hip-Hop / R&B / Caribbean dancehall):
Big rooms: Mira, SAINT NYC, Native Lounge, Lagos NYC, Republica Lounge, Aura Lounge, SOB's, The Delancey, Lot 45, Basement at Public Records
Small/intimate: Shrine, Sankofa Haus, C'mon Everybody, Nublu, The Jane Ballroom
Energy: Cultural gravity. Afro-diaspora, Black creative class, fashion-forward. Music-driven nightlife with REAL DJ culture. NOT generic bars that play hip-hop sometimes.

LATIN NIGHTS (Reggaeton / Salsa / Bachata / Latin DJ):
Big rooms: Cantina Rooftop, Mariposa, La Boom, Taj Lounge, Casa Mezcal, Room 520, Vandal
Small/intimate: Bembe, Solas Bar, Yuca Bar, Casa La Femme
Energy: Latin music is the MAIN EVENT, not background. Dancing culture. From sweaty bachata nights to upscale reggaeton lounges.

PULSE (House / EDM / Techno / Disco):
Big rooms: Marquee, Nebula, Avant Gardner, Elsewhere, House of Yes, The Brooklyn Mirage, Le Bain, Public Records
Small/intimate: Good Room, TBA Brooklyn, Jupiter Disco, Nightmoves
Energy: Music-first. DJ culture. Electronic music community. From massive warehouse raves to intimate vinyl sets.

LOW LIGHT (Speakeasy / Jazz / Cocktail / Wine):
Big rooms: Amber Room, Blue Note, Smalls Jazz Club, The Django, Angel's Share, Employees Only, Bathtub Gin, Dear Irving
Small/intimate: Clover Club, Mace, Raines Law Room, Bar Goto, Mezzrow, Ornithology Jazz Club
Energy: Craft cocktails, jazz, intimate conversation. Hidden entrances, dim lighting, intentional atmosphere. NOT generic sports bars.

DINING:

STEAKHOUSE: STK, Peter Luger, Keens, Quality Meats, Delmonico's, Wolfgang's
Standard: Premium cuts, upscale atmosphere, date-night worthy. NOT burger joints or casual grills.

ITALIAN: Carbone, Don Angie, L'Artusi, Via Carota, Emilio's Ballato, I Sodi, Malatesta Trattoria, Bar Primi
Standard: Beautiful interior, intentional pasta/wine experience. NOT pizza-by-slice, NOT counter service, NOT red-sauce tourist traps.

JAPANESE: Zuma, Nobu, TAO, Sushi Noz, Katsuei, Tanoshi Sushi, Rule of Thirds, Kono
Standard: Quality sushi/omakase/robata, aesthetic presentation. NOT conveyor belt sushi, NOT fast ramen counters.

SOUL FOOD: Red Rooster, Sylvia's, Cornbread, Amy Ruth's, Melba's, DaSylvia's, Charles Pan-Fried Chicken, FieldTrip, Clay, The Fly
Standard: Elevated comfort food with real soul. Cultural significance. NOT generic American diners.

CARIBBEAN: The Islands, Footprints Cafe, Jerk Pan, Pikliz, Miss Lily's, Glady's, Negril Village, The Simpson Restaurant, Suede
Standard: Authentic Caribbean cuisine with atmosphere. Jerk, oxtail, curry goat done RIGHT in a space that feels intentional.

KOREAN: miss KOREA BBQ, Jongro BBQ, Kang Ho Dong Baekjeong, Atoboy
Standard: Premium KBBQ or innovative Korean dining. NOT generic bibimbap takeout spots.

SEAFOOD: Catch NYC, Seamore's, Ocean Prime, The Fulton, Crave Fishbar
Standard: Upscale seafood with ambiance. Raw bars, oyster programs, beautiful plating. NOT fried fish shacks, NOT boil-in-a-bag chains, NOT counter service.

MEXICAN: Casa Enrique, Empellón, Cosme, Atla
Standard: Elevated Mexican cuisine, beautiful space. NOT taco trucks, NOT Tex-Mex chains.

LATIN AMERICAN: Raclette, Llama Inn, La Grande Boucherie (if South American focus)
Standard: Quality Latin American cuisine beyond basic. Colombian, Peruvian, Brazilian, Argentinian — with atmosphere.

FUSION: Buddakan, OBAO, Fish Cheeks, Thai Diner, Win Son, Shalom Japan, Chino Grande
Standard: Creative crossover cuisine, interesting concept, great aesthetic.

AMERICAN: Beauty & Essex, The Ned NoMad, RH Rooftop, LAVO
Standard: Upscale American with a SCENE. Beautiful interior, trendy crowd, date-night energy. NOT diners, NOT casual burger spots.

INDIAN: Quality Indian restaurants with atmosphere, not buffet-style.

THAI: Quality Thai with ambiance, not takeout counters.

CHINESE: Quality Chinese dining, not takeout spots or food court stalls.

MEDITERRANEAN: Upscale Med/Greek/Turkish with atmosphere.

KILL CRITERIA — Remove if ANY of these apply:
- Chain restaurant (national or regional chain with 10+ locations)
- Counter service / order-at-register / pizza-by-slice
- Diner (classic American diner aesthetic)
- Concert venue / arena / theater (NOT a restaurant/bar)
- Food court, cafeteria, buffet (AYCE)
- Catering company, mobile service, food truck
- Generic burger joint (no intentional vibe)
- Takeout-only / delivery-only
- Sports bar with no food identity
- Low-effort aesthetic (plastic chairs, fluorescent lights, strip mall feel)
- Tourist trap with no real food/nightlife identity
- Hookah-only lounge with no food or music programming

KEEP CRITERIA — A venue STAYS if it has:
- Intentional interior design / aesthetic
- Real dining or nightlife EXPERIENCE
- A place you'd bring a date, group of friends, or celebrate at
- Cultural significance or community importance
- Good photos, social media presence, professional operation
- Could be featured in Eater, Infatuation, TimeOut, or Instagram lifestyle pages

IMPORTANT RULES:
- A venue can be small/intimate and still be Lumina-worthy (see small room anchors above)
- High review count alone does NOT qualify a venue
- Low review count does NOT disqualify — hidden gems are valuable
- If a venue is borderline, check: "Would this fit on the same list as the anchor venues in its world?"
- French restaurants → american or fusion world
- Seafood restaurants CAN be Lumina-worthy if upscale with ambiance — don't kill all seafood`;

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
{"worthy": true/false, "kill_reason": "reason or null", "world": "correct_world", "vibes": ["vibe1","vibe2"], "energy": 7, "price_tier": "moderate/upscale/premium/budget", "scene_candidate": "afrobeats/latin/hiphop/house/jazz/r&b/mixed/none", "confidence": 0.85}

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
    const parsed = JSON.parse(clean);
    
    // Fix invalid worlds
    if (!['outside','latin_nights','pulse','low_light','soul_food','caribbean','italian','mexican','latin_american','indian','korean','thai','japanese','chinese','seafood','mediterranean','american','fusion','steakhouse'].includes(parsed.world)) {
      parsed.world = venue.world_hint; // fallback to original
    }
    
    return parsed;
  } catch (e) {
    console.error(`  ❌ AI error for ${venue.name}: ${e.message}`);
    return null;
  }
}

async function run() {
  console.log('LUMINA AI CLASSIFIER v3 — Full Anchor System\n');

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

    const chainMatch = isChainKill(v.name);
    if (chainMatch) {
      chainKilled++;
      console.log(`${label} 🚫 CHAIN: ${chainMatch}`);
      killedVenues.push({ name: v.name, city: v.city, reason: `chain: ${chainMatch}`, world_hint: v.world_hint });
      continue;
    }

    process.stdout.write(`${label} `);
    const result = await classifyVenue(v);

    if (!result) {
      errors++;
      console.log('⚠️ ERROR — keeping');
      classified.push({ ...v, ai_classified: false });
      continue;
    }

    if (!result.worthy) {
      killed++;
      console.log(`❌ ${result.kill_reason}`);
      killedVenues.push({ name: v.name, city: v.city, reason: result.kill_reason, world_hint: v.world_hint });
      continue;
    }

    const worldChanged = result.world !== v.world_hint;
    if (worldChanged) worldChanges++;
    kept++;
    console.log(`✅ ${result.world}${worldChanged ? ` (was ${v.world_hint})` : ''} | ${result.vibes.join(',')} | e:${result.energy} | ${result.price_tier}`);

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

    if ((i + 1) % BATCH_SIZE === 0) await new Promise(r => setTimeout(r, DELAY));
  }

  fs.writeFileSync('/opt/viberyte/lumina-web/data/ai_classified_v3.json', JSON.stringify(classified, null, 2));
  fs.writeFileSync('/opt/viberyte/lumina-web/data/ai_killed_v3.json', JSON.stringify(killedVenues, null, 2));

  const cost = (allVenues.length - chainKilled) * 0.0005;

  console.log(`\n${'='.repeat(50)}`);
  console.log('  AI CLASSIFICATION v3 COMPLETE');
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Kept: ${kept}`);
  console.log(`🚫 Chain killed: ${chainKilled}`);
  console.log(`❌ AI killed: ${killed}`);
  console.log(`⚠️ Errors: ${errors}`);
  console.log(`🔄 World corrections: ${worldChanges}`);
  console.log(`💰 Est cost: ~$${cost.toFixed(2)}`);

  const wc = {};
  classified.forEach(v => { const w = v.ai_world || v.world_hint; wc[w] = (wc[w] || 0) + 1; });
  console.log('\nBy world:');
  Object.entries(wc).sort((a,b) => b[1]-a[1]).forEach(([w,c]) => console.log(`  ${w}: ${c}`));

  const cc = {};
  classified.forEach(v => { cc[v.city] = (cc[v.city] || 0) + 1; });
  console.log('\nBy city:');
  Object.entries(cc).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(`  ${c}: ${n}`));
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
