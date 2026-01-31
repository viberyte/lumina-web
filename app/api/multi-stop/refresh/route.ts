import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

const reasoningCache = new Map<string, { reasoning: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

const pickRandomN = (arr: any[], n: number) => {
  if (arr.length === 0) return [];
  if (arr.length <= n) return arr;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

export async function POST(request: Request) {
  try {
    const { primaryVenueId, tier, excludeIds = [] } = await request.json();
    
    console.log('🔄 Refresh tier:', tier, '| Exclude:', excludeIds);
    
    if (!primaryVenueId || !tier) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400, headers: corsHeaders });
    }

    const db = new Database(dbPath);
    const primaryVenue: any = db.prepare('SELECT * FROM venues WHERE id = ?').get(primaryVenueId);
    
    if (!primaryVenue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404, headers: corsHeaders });
    }

    const allVenues: any[] = db.prepare(`SELECT * FROM venues WHERE neighborhood = ? AND id != ? LIMIT 150`).all(primaryVenue.neighborhood, primaryVenueId);
    const targetDate = new Date().toISOString().split('T')[0];
    const events: any[] = db.prepare(`SELECT * FROM events WHERE event_date LIKE ? LIMIT 50`).all(`${targetDate}%`);
    db.close();

    const parseVibes = (vibes: any): string[] => {
      if (!vibes) return [];
      if (typeof vibes === 'string') {
        try {
          const parsed = JSON.parse(vibes);
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      }
      return Array.isArray(vibes) ? vibes : [];
    };

    let filteredVenues: any[] = [];
    let filteredEvents: any[] = [];

    if (tier === 'safe') {
      filteredVenues = allVenues.filter(v => {
        const vibes = parseVibes(v.vibe_tags).map((t: string) => t.toLowerCase());
        const cuisine = (v.cuisine_primary || '').toLowerCase();
        return cuisine.includes('dessert') || cuisine.includes('cafe') || vibes.some((t: string) => ['cozy', 'quiet', 'intimate'].includes(t));
      }).filter(v => !excludeIds.includes(v.id));
      filteredEvents = events.filter(e => !excludeIds.includes(e.id) && !(e.music_genre || '').toLowerCase().includes('club'));
    } else if (tier === 'elevated') {
      filteredVenues = allVenues.filter(v => {
        const vibes = parseVibes(v.vibe_tags).map((t: string) => t.toLowerCase());
        return vibes.some((t: string) => ['rooftop', 'speakeasy', 'trendy'].includes(t));
      }).filter(v => !excludeIds.includes(v.id));
      filteredEvents = events.filter(e => !excludeIds.includes(e.id) && ((e.music_genre || '').includes('jazz') || (e.title || '').includes('comedy')));
    } else {
      filteredVenues = allVenues.filter(v => {
        const vibes = parseVibes(v.vibe_tags).map((t: string) => t.toLowerCase());
        return vibes.some((t: string) => ['club', 'dance', 'party'].includes(t));
      }).filter(v => !excludeIds.includes(v.id));
      filteredEvents = events.filter(e => !excludeIds.includes(e.id) && (e.music_genre || '').includes('afrobeats'));
    }

    const selected = [...pickRandomN(filteredVenues, 2).map(v => ({ type: 'venue', data: v })), ...pickRandomN(filteredEvents, 1).map(e => ({ type: 'event', data: e }))];

    const formatted = selected.map(opt => {
      const item = opt.data;
      const isEvent = opt.type === 'event';
      return {
        id: item.id,
        kind: isEvent ? 'event' : 'venue',
        title: isEvent ? item.title : item.name,
        image: isEvent ? item.image_url : item.professional_photo_url,
        subtitle: isEvent ? item.music_genre : item.cuisine_primary,
        neighborhood: isEvent ? item.venue_neighborhood : item.neighborhood,
        travelTime: 'Same area',
        reasoning: 'Perfect next stop.',
        proTip: tier === 'safe' ? 'Easy vibe' : tier === 'elevated' ? 'Refined' : 'High energy'
      };
    });

    return NextResponse.json({ tier, options: formatted }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
