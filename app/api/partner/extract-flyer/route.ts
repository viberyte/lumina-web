import { NextRequest, NextResponse } from 'next/server';

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image_base64 } = body;

    if (!image_base64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400, headers: corsHeaders });
    }

    console.log('[extract-flyer] Sending to OpenAI, image size:', image_base64.length);

    const systemPrompt = `You are an event flyer data extractor for nightlife events. Analyze the image and extract event details. Return ONLY valid JSON with these fields:
{
  "title": "event name (NOT the DJ/artist names - look for the main event title)",
  "lineup": "DJ or artist names, comma separated, or null",
  "event_date": "YYYY-MM-DD format or null. IMPORTANT: Flyers often show dates as M.DD or MM.DD (month.day US format). THU 3.12 means March 12. 2.8.26 means February 8 2026. Always interpret as month.day not day.month. Use current year 2026 if year not shown.",
  "event_time": "HH:MM in 24hr format or null. Convert from 12hr if needed (10:30 PM = 22:30, 6pm = 18:00). Look for words like doors, starts, begins.",
  "genre": "music genre if identifiable (Hip Hop, R&B, Latin, Reggaeton, House, EDM, Afrobeats, Top 40, Throwbacks, Open Format) or null",
  "venue_name": "venue or location name or null",
  "address": "street address if shown on flyer or null",
  "description": "brief event description from flyer text (NOT the address) or null",
  "packages": "array of bottle/table packages if pricing is shown, or null. Each package: { name, price, bottle_count, max_guests, description }. Example: [{ \"name\": \"VIP Table\", \"price\": 500, \"bottle_count\": 2, \"max_guests\": 6, \"description\": \"Premium seating\" }]. Infer bottle_count and max_guests from context if not explicit. Set to null if no packages/pricing visible."
}
Do NOT include any text outside the JSON. If a field is not visible set it to null.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract all event details from this flyer:' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[extract-flyer] OpenAI error:', err);
      return NextResponse.json({ error: 'AI extraction failed' }, { status: 500, headers: corsHeaders });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('[extract-flyer] OpenAI response:', content);

    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let extracted;
    try {
      extracted = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[extract-flyer] JSON parse failed, raw:', cleaned);
      return NextResponse.json({ error: 'Could not parse flyer details' }, { status: 422, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, extracted }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[extract-flyer] Error:', error.message);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500, headers: corsHeaders });
  }
}
