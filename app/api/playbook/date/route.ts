import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

interface DatePlaybookRequest {
  city: string;
  answers: {
    baseline: 'calm' | 'social' | 'late';
    persona: string;
    entry: 'seamless' | 'some_wait' | 'flex';
    arc: 'deep_dive' | 'build' | 'peak';
    flex: 'icon' | 'insider';
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: DatePlaybookRequest = await request.json();
    const { city, answers } = body;

    // Load persona configuration
    const persona = db.prepare(`
      SELECT * FROM persona_mapping WHERE persona_name = ?
    `).get(answers.persona) as any;

    if (!persona) {
      return NextResponse.json({ error: 'Invalid persona' }, { status: 400 });
    }

    // Compute acoustic arc
    const arcBands = computeArc(answers.baseline, answers.arc);

    // Compute effective constraints
    let frictionCap = answers.baseline === 'calm' ? 1 : 
                      answers.baseline === 'social' ? 2 : 3;
    
    if (answers.entry === 'seamless') frictionCap = 1;
    else if (answers.entry === 'flex') frictionCap = 3;

    let gatekeeperMin = persona.min_gatekeeper_status;
    if (answers.flex === 'insider') {
      gatekeeperMin = Math.max(gatekeeperMin, 3);
    }

    const popularityMin = answers.flex === 'icon' ? 2 : 0;
    const popularityMax = answers.flex === 'insider' ? 1 : 3;

    // Query venues for each band in the arc
    const stops = [];
    
    for (let i = 0; i < arcBands.length; i++) {
      const band = arcBands[i];
      const role = i === 0 ? 'Anchor' : i === arcBands.length - 1 ? 'Peak' : 'Bridge';
      
      const venue = db.prepare(`
        SELECT 
          v.*,
          (
            (CASE WHEN v.gatekeeper_status >= ? THEN 2 ELSE 0 END) +
            (CASE WHEN v.friction_score <= ? THEN 2 ELSE 0 END) +
            (CASE WHEN v.popularity >= ? AND v.popularity <= ? THEN 1 ELSE 0 END) +
            (CASE WHEN v.aesthetic_proxy = ? THEN 2 ELSE 0 END) +
            (CASE WHEN v.conversation_level >= ? THEN 1 ELSE 0 END)
          ) AS match_score
        FROM venues v
        WHERE v.city LIKE ?
          AND v.acoustic_band = ?
          AND v.friction_score <= ?
          AND v.gatekeeper_status >= ?
        ORDER BY match_score DESC, v.google_rating DESC
        LIMIT 1
      `).get(
        gatekeeperMin,
        frictionCap,
        popularityMin,
        popularityMax,
        persona.aesthetic_proxy,
        persona.conversation_level,
        `%${city}%`,
        band,
        frictionCap,
        gatekeeperMin
      ) as any;

      if (venue) {
        stops.push({
          role,
          band,
          venue: {
            id: venue.id,
            name: venue.name,
            city: venue.city,
            rating: venue.google_rating,
            photo: venue.google_photos ? JSON.parse(venue.google_photos)[0] : null
          },
          why: generateWhy(venue, role)
        });
      }
    }

    const playbook = {
      playbook_name: generatePlaybookName(answers),
      summary: generateSummary(answers, persona),
      stops,
      lumina_script: generateScript(answers)
    };

    return NextResponse.json(playbook);

  } catch (error) {
    console.error('Playbook error:', error);
    return NextResponse.json({ error: 'Failed to generate playbook' }, { status: 500 });
  }
}

function computeArc(baseline: string, arc: string): number[] {
  if (arc === 'deep_dive') return [baseline === 'calm' ? 1 : baseline === 'social' ? 2 : 3];
  if (arc === 'build') return [1, 2];
  if (arc === 'peak') return [2, 3];
  return [1];
}

function generateWhy(venue: any, role: string): string[] {
  const reasons = [];
  if (role === 'Anchor') reasons.push('Low friction', 'Conversation-friendly');
  if (role === 'Bridge') reasons.push('Energy lift', 'Social vibe');
  if (role === 'Peak') reasons.push('High energy', 'Curated crowd');
  return reasons;
}

function generatePlaybookName(answers: any): string {
  if (answers.flex === 'insider' && answers.arc === 'build') return 'Insider Build';
  return 'Custom Flow';
}

function generateSummary(answers: any, persona: any): string {
  return `Mapped for ${persona.persona_name}. Starting ${answers.baseline}.`;
}

function generateScript(answers: any): string[] {
  return [
    `I mapped a ${generatePlaybookName(answers)} for you.`,
    `We'll start ${answers.baseline === 'calm' ? 'calm' : 'with energy'}.`
  ];
}
