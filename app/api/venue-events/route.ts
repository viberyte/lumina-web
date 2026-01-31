import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    
    if (!venueId) {
      return NextResponse.json({ error: 'venueId required' }, { status: 400 });
    }
    
    const db = new Database(dbPath);
    const today = new Date().toISOString().split('T')[0];
    
    // Get upcoming events only
    const venueEvents = db.prepare(`
      SELECT 
        id, title as name, event_date, event_time, 
        description, recurring, 'apify' as source
      FROM venue_events
      WHERE venue_id = ?
        AND event_date >= ?
      ORDER BY event_date ASC, event_time ASC
      LIMIT 10
    `).all(venueId, today);
    
    db.close();
    
    // Format events
    const formattedEvents = venueEvents.map((event: any) => {
      let displayDate = 'Upcoming';
      
      if (event.event_date) {
        const eventDate = new Date(event.event_date);
        const todayDate = new Date(today);
        const diffDays = Math.floor((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) displayDate = 'Tonight';
        else if (diffDays === 1) displayDate = 'Tomorrow';
        else if (diffDays <= 7) displayDate = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
        else displayDate = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      return {
        id: event.id,
        name: event.name,
        date: event.event_date,
        time: event.event_time,
        description: event.description,
        displayDate,
        ticketUrl: null,
        hasTickets: false
      };
    });
    
    return NextResponse.json({
      ok: true,
      events: formattedEvents.slice(0, 5),
      count: formattedEvents.length
    });
    
  } catch (error: any) {
    console.error('Events API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
