import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

interface Venue {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  price_tier: string;
  google_rating: number;
  primary_vibes: string;
  energy_level: string;
  cuisine_primary: string;
  late_night_spot: number;
  tier: string;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function scoreVenue(venue: any, currentVenue: Venue | null, distance: number, hour: number): number {
  let score = 100;

  // City-Smart Distance Scoring
  if (distance <= 0.5) {
    score += 20;
  } else if (distance > 2.5 && distance <= 5.0) {
    score -= (distance - 2.5) * 15;
  } else if (distance > 5.0) {
    score -= 37.5 + ((distance - 5.0) * 25);
  }

  if (hour >= 22) {
    if (venue.energy_level === 'high') score += 30;
    if (venue.category === 'nightclub') score += 25;
    if (venue.late_night_spot) score += 15;
  } else if (hour >= 19) {
    if (venue.category === 'bar' || venue.category === 'lounge') score += 20;
  }

  if (venue.google_rating >= 4.5) score += 15;
  else if (venue.google_rating >= 4.0) score += 10;

  if (venue.tier === 'marketing') score += 30;
  else if (venue.tier === 'premium') score += 50;

  if (venue.priority_score) score += venue.priority_score;

  return Math.max(0, Math.min(250, score));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, max_distance = 10, limit = 3, current_venue_id, user_id } = body;

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Location required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);
    const hour = new Date().getHours();

    let currentVenue: Venue | null = null;
    if (current_venue_id) {
      currentVenue = db.prepare(`
        SELECT id, name, category, latitude, longitude, primary_vibes, energy_level, cuisine_primary
        FROM venues WHERE id = ?
      `).get(current_venue_id) as Venue;
    }

    const venues = db.prepare(`
      SELECT 
        v.id, v.name, v.address, v.latitude, v.longitude, 
        v.category, v.price_tier, v.google_rating, v.primary_vibes,
        v.energy_level, v.late_night_spot, v.after_hours_spot,
        p.tier, nsp.priority_score
      FROM venues v
      LEFT JOIN partners p ON v.partner_id = p.id
      LEFT JOIN next_stop_preferences nsp ON v.id = nsp.venue_id
      WHERE v.latitude IS NOT NULL 
      AND v.longitude IS NOT NULL
      AND v.id != ?
    `).all(current_venue_id || 0) as any[];

    const scoredVenues = venues
      .map(venue => {
        const distance = getDistance(latitude, longitude, venue.latitude, venue.longitude);
        if (distance > max_distance) return null;

        const score = scoreVenue(venue, currentVenue, distance, hour);
        
        return {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          category: venue.category,
          distance: parseFloat(distance.toFixed(2)),
          score: Math.round(score),
          tier: venue.tier || 'free'
        };
      })
      .filter(v => v !== null && v.score > 40)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, limit);

    db.close();

    return NextResponse.json({
      success: true,
      recommendations: scoredVenues,
      current_time: hour
    });

  } catch (error) {
    console.error('Next Stop error:', error);
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}
