import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// Parse various date formats into YYYY-MM-DD
function parseEventDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10);
  }
  
  // Format: "December 23, 2025 11:00 PM"
  const monthMatch = dateStr.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthMatch) {
    const months: Record<string, string> = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const month = months[monthMatch[1]];
    const day = monthMatch[2].padStart(2, '0');
    const year = monthMatch[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Format: "12.26.2025" or similar
  const dotMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    const month = dotMatch[1].padStart(2, '0');
    const day = dotMatch[2].padStart(2, '0');
    const year = dotMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const limit = parseInt(searchParams.get('limit') || '30');
    
    if (isNaN(venueId)) {
      return NextResponse.json({ error: 'Invalid venue ID' }, { status: 400 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    // Verify venue exists
    const venue = db.prepare(`
      SELECT id, name, category FROM venues WHERE id = ?
    `).get(venueId) as any;

    if (!venue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Get ALL events for this venue
    const allEvents = db.prepare(`
      SELECT * FROM events WHERE venue_id = ? ORDER BY id DESC
    `).all(venueId) as any[];

    db.close();

    const today = new Date().toISOString().split('T')[0];

    // Process events with proper date parsing
    const processedEvents = allEvents.map((e: any) => {
      const parsedDate = parseEventDate(e.event_date) || parseEventDate(e.date);
      return {
        ...e,
        parsed_date: parsedDate,
        is_upcoming: parsedDate ? parsedDate >= today : false,
        title: e.name || e.title || 'Untitled Event',
        genre: e.music_genre,
        tags: e.tags ? (typeof e.tags === 'string' ? (() => { try { return JSON.parse(e.tags); } catch { return e.tags; } })() : e.tags) : null,
      };
    }).filter(e => e.parsed_date); // Only include events with valid dates

    // Split into upcoming and past
    const upcoming = processedEvents
      .filter(e => e.is_upcoming)
      .sort((a, b) => a.parsed_date.localeCompare(b.parsed_date));
    
    // Cap past events at 15
    const past = processedEvents
      .filter(e => !e.is_upcoming)
      .sort((a, b) => b.parsed_date.localeCompare(a.parsed_date))
      .slice(0, 15);

    // Apply filter
    let filteredEvents: any[] = [];
    if (filter === 'upcoming') {
      filteredEvents = upcoming.slice(0, limit);
    } else if (filter === 'past') {
      filteredEvents = past.slice(0, limit);
    } else {
      filteredEvents = [...upcoming, ...past].slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      venue_name: venue.name,
      venue_category: venue.category,
      filter: filter,
      counts: {
        total: upcoming.length + past.length,
        upcoming: upcoming.length,
        past: past.length
      },
      events: filteredEvents
    });

  } catch (error) {
    console.error('Error fetching venue events:', error);
    return NextResponse.json({ error: 'Failed to fetch venue events' }, { status: 500 });
  }
}
