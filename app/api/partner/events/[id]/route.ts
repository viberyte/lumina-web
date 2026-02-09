import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

function getToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('partner_token')?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

function getPartnerId(token: string): number | null {
  const session = db.prepare(`
    SELECT partner_id FROM partner_sessions 
    WHERE token = ? AND expires_at > datetime('now')
  `).get(token) as any;
  return session?.partner_id || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const eventId = parseInt(params.id);

    const event = db.prepare(`
      SELECT 
        pe.id, pe.title, pe.event_date, pe.event_time, pe.genre,
        pe.description, pe.sections, pe.packages, pe.image_url, pe.status,
        pe.on_explore, pe.ticket_url,
        pv.name as venue_name, pv.id as venue_id
      FROM partner_events pe
      LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
      WHERE pe.id = ? AND pe.partner_id = ?
    `).get(eventId, partnerId) as any;

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get packages from event_packages table
    const packages = db.prepare(`
      SELECT id, name, description, bottle_count, price, section_id, max_guests
      FROM event_packages
      WHERE event_id = ?
      ORDER BY price ASC
    `).all(eventId) as any[];

    // Compute display_status
    const today = new Date().toISOString().split('T')[0];
    const display_status = event.event_date < today ? 'past' 
      : event.event_date === today ? 'live' : 'upcoming';

    return NextResponse.json({ 
      event: { ...event, display_status }, 
      packages 
    });
  } catch (error: any) {
    console.error('Event fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const eventId = parseInt(params.id);

    // Verify ownership
    const existing = db.prepare(`
      SELECT id FROM partner_events WHERE id = ? AND partner_id = ?
    `).get(eventId, partnerId) as any;

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, event_date, event_time, genre, description, packages, image_url, on_explore, ticket_url } = body;

    // Only update fields that are provided
    const updates: string[] = [];
    const values: any[] = [];
    
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (event_date !== undefined) { updates.push('event_date = ?'); values.push(event_date); }
    if (event_time !== undefined) { updates.push('event_time = ?'); values.push(event_time); }
    if (genre !== undefined) { updates.push('genre = ?'); values.push(genre); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (image_url !== undefined) { updates.push('image_url = ?'); values.push(image_url); }
    if (on_explore !== undefined) { updates.push('on_explore = ?'); values.push(on_explore); }
    if (ticket_url !== undefined) { updates.push('ticket_url = ?'); values.push(ticket_url); }
    
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(eventId);
      db.prepare(`UPDATE partner_events SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    // Update packages if provided
    if (packages && Array.isArray(packages)) {
      // Delete existing packages
      db.prepare(`DELETE FROM event_packages WHERE event_id = ?`).run(eventId);

      // Insert new packages
      for (const pkg of packages) {
        db.prepare(`
          INSERT INTO event_packages (event_id, name, description, bottle_count, price, section_id, max_guests)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          eventId,
          pkg.name,
          pkg.description || null,
          pkg.bottleCount || pkg.bottle_count || 2,
          pkg.price || 0,
          pkg.sectionId || pkg.section_id || null,
          pkg.maxGuests || pkg.max_guests || 6
        );
      }
    }

    // Also update packages JSON on the event record
    if (packages && Array.isArray(packages)) {
      db.prepare(`UPDATE partner_events SET packages = ? WHERE id = ?`).run(JSON.stringify(packages), eventId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Event update error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partnerId = getPartnerId(token);
    if (!partnerId) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const eventId = parseInt(params.id);

    // Verify ownership
    const existing = db.prepare(`
      SELECT id FROM partner_events WHERE id = ? AND partner_id = ?
    `).get(eventId, partnerId) as any;

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete packages first
    db.prepare(`DELETE FROM event_packages WHERE event_id = ?`).run(eventId);

    // Delete event
    db.prepare(`DELETE FROM partner_events WHERE id = ?`).run(eventId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Event delete error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
