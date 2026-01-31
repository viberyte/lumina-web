import Database from 'better-sqlite3';
import OpenAI from 'openai';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2';

async function processVenueInsights(venueId) {
  console.log(`\n🔍 Processing venue ${venueId}...`);
  
  const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(venueId);
  if (!venue) {
    console.log('❌ Venue not found');
    return;
  }
  
  if (!venue.top_reviews) {
    console.log('⚠️  No reviews');
    return;
  }
  
  let reviews;
  try {
    reviews = JSON.parse(venue.top_reviews);
    if (!Array.isArray(reviews) || reviews.length === 0) {
      console.log('⚠️  Invalid reviews');
      return;
    }
  } catch (e) {
    console.log('⚠️  Parse error');
    return;
  }
  
  console.log(`📊 Found ${reviews.length} reviews`);
  const reviewText = reviews.map(r => r.text).join('\n\n---\n\n');
  
  const prompt = `Analyze Google reviews for ${venue.name}.

VENUE: ${venue.name}
CUISINE: ${venue.cuisine || venue.cuisine_primary || 'N/A'}
PRICE: ${venue.price_tier || 'N/A'}
NEIGHBORHOOD: ${venue.neighborhood || 'N/A'}

REVIEWS:
${reviewText.substring(0, 3000)}

Generate based ONLY on actual review patterns (no generic statements):

1. WHAT TO EXPECT (3 specific observations):
- Crowd type, dress code, peak times, atmosphere
- From actual review mentions

2. WHAT TO DO HERE (3 actionable tips):
- Timing, seating, ordering strategies
- From real reviewer experiences

3. HOW TO SPEND (specific items):
- Signature dishes/drinks by name
- Popular menu items mentioned
- Price insights from reviews

Return JSON:
{
  "what_to_expect": ["specific insight 1", "insight 2", "insight 3"],
  "what_to_do": ["actionable tip 1", "tip 2", "tip 3"],
  "how_to_spend": {
    "signature_items": ["actual item 1", "item 2"],
    "avg_price_range": "$X-Y per person",
    "best_for": "occasion from reviews"
  },
  "known_for": "top 2-3 items mentioned in reviews"
}

CRITICAL: Only include what's explicitly in reviews. No assumptions.`;

  try {
    console.log('🤖 Analyzing...');
    
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Extract ONLY real insights from reviews. Be specific. Never make up generic statements.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 800,
    });
    
    const response = completion.choices[0].message.content;
    const jsonText = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const insights = JSON.parse(jsonText);
    
    db.prepare(`
      UPDATE venues 
      SET what_to_expect = ?, what_to_do = ?, how_to_spend = ?, known_for = ?, insights_generated_at = datetime('now')
      WHERE id = ?
    `).run(
      JSON.stringify(insights.what_to_expect),
      JSON.stringify(insights.what_to_do),
      JSON.stringify(insights.how_to_spend),
      insights.known_for,
      venueId
    );
    
    console.log(`✅ ${venue.name}`);
    console.log('   Known For:', insights.known_for);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function processAllVenues() {
  const venues = db.prepare(`
    SELECT id, name 
    FROM venues 
    WHERE top_reviews IS NOT NULL 
    ORDER BY id
  `).all();
  
  console.log(`\n🚀 Processing ${venues.length} venues with reviews...\n`);
  
  for (const venue of venues) {
    await processVenueInsights(venue.id);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ All venues processed!');
}

const venueId = process.argv[2];
if (venueId) {
  await processVenueInsights(parseInt(venueId));
  process.exit(0);
} else {
  await processAllVenues();
  process.exit(0);
}
