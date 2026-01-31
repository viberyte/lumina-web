import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import OpenAI from 'openai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { venueId, budget, partySize = 1, context = 'Solo' } = await request.json();
    
    console.log('Budget API received:', { venueId, budget, partySize, context });
    
    if (!venueId || !budget) {
      return NextResponse.json(
        { error: 'Missing venueId or budget' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const db = new Database(dbPath);
    const venue: any = db.prepare('SELECT * FROM venues WHERE id = ?').get(venueId);
    
    if (!venue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404, headers: corsHeaders });
    }
    
    const items = db.prepare(`
      SELECT * FROM menu_items 
      WHERE venue_id = ?
      ORDER BY category, price
    `).all(venueId);
    
    db.close();
    
    if (!items || items.length === 0) {
      return NextResponse.json({
        error: 'no_menu',
        message: `Menu not available yet for ${venue.name}`
      }, { headers: corsHeaders });
    }
    
    const byCategory: any = {};
    items.forEach((item: any) => {
      const cat = item.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    });
    
    const menuSummary = Object.entries(byCategory).map(([cat, items]: [string, any]) => {
      const itemList = items.slice(0, 15).map((i: any) => 
        `- ${i.item_name} ($${i.price})${i.is_signature ? ' SIGNATURE' : ''}`
      ).join('\n');
      return `${cat.toUpperCase()}:\n${itemList}`;
    }).join('\n\n');
    
    const occasionContext = typeof context === 'string' ? context : context.who || 'Solo';
    
    const prompt = `You are Lumina, a thoughtful nightlife concierge. Create a meal recommendation that feels personal, confident, and socially aware.

Restaurant: ${venue.name}
Budget: $${budget} per person
Party Size: ${partySize}
Occasion: ${occasionContext}

Menu:
${menuSummary}

CRITICAL: Your response must feel like advice from a trusted friend who wants them to feel CONFIDENT, not just "within budget."

${occasionContext === 'Date night' || occasionContext === 'date' ? `
DATE NIGHT PRIORITIES:
- Optimize for shared experience between them and their date
- Reduce over-ordering (don't let them look excessive)
- Explicitly reassure them this is ENOUGH food
- Suggest what to share vs individual items
- Make them feel smart, not cheap
- Protect them socially AND financially
- Use phrases like: "enough for both of you", "feels intentional", "full date-night experience"
` : ''}

${occasionContext === 'Solo' ? `
SOLO PRIORITIES:
- Optimize for comfort and personal enjoyment
- Suggest bar seating if appropriate (faster service, better vibe)
- Keep it simple but satisfying
- Acknowledge this is their time to enjoy
- Use phrases like: "settle in", "your pace", "treat yourself"
` : ''}

${occasionContext === 'With friends' || occasionContext === 'Group outing' ? `
GROUP PRIORITIES:
- Emphasize shareability
- Suggest splitting strategy
- Avoid items awkward to split
- Keep everyone fed without overspending
- Use phrases like: "for the table", "split as needed", "everyone gets to try"
` : ''}

${occasionContext === 'Business' ? `
BUSINESS PRIORITIES:
- Professional, easy to eat
- Nothing messy or awkward
- Moderate portions that don't distract
- Safe choices that won't raise eyebrows
` : ''}

Return ONLY valid JSON:
{
  "recommended_meal": [
    {"item": "Dish Name", "price": 32, "reason": "Brief reason tied to occasion"}
  ],
  "total": 72,
  "within_budget": true,
  "narrative": "2-3 sentences explaining WHY this order works for their specific situation. Be warm, confident, and make them feel good about this choice. Reference their occasion directly.",
  "pro_tip": "One insider tip about ordering, timing, or experience",
  "emoji": "🍷"
}

The "narrative" is the MOST IMPORTANT field. It should feel like a friend saying "Trust me, this is the move."`;

    const response = await openai.chat.completions.create({
      model: 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });
    
    const text = response.choices[0].message.content?.trim() || '';
    
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .trim();
    
    let recommendation;
    try {
      recommendation = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', cleanedText);
      return NextResponse.json(
        { error: 'invalid_json', message: 'AI returned invalid format' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json({
      venue: { id: venue.id, name: venue.name, neighborhood: venue.neighborhood },
      budget,
      partySize,
      context: occasionContext,
      recommendation
    }, { headers: corsHeaders });
    
  } catch (error: any) {
    console.error('Budget meal error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendation', message: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
