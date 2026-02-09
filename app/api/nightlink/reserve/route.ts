import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, packageId, packageName, packagePrice, type, name, phone, partySize, instagram, notes } = body;

    if (!eventId || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = new Database(path.join(process.cwd(), 'data', 'lumina.db'));

    try {
      const event = db.prepare(`
        SELECT pe.*, pv.id as venue_id, pv.name as venue_name
        FROM partner_events pe
        LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
        WHERE pe.id = ?
      `).get(eventId) as any;

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      const code = 'NL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

      const result = db.prepare(`
        INSERT INTO partner_bookings (
          venue_id, event_id, invite_code, host_name, host_phone, host_email,
          table_type, booking_date, booking_time, total_amount, guest_count,
          status, confidence, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'medium', ?, datetime('now'), datetime('now'))
      `).run(
        event.venue_id,
        eventId,
        code,
        name,
        phone,
        null,
        type === 'table' ? (packageName || 'Table') : 'Guest List',
        event.event_date,
        event.event_time || '22:00',
        type === 'table' ? (packagePrice || 0) : (event.guest_list_price || 0),
        partySize || 2,
        [
          type === 'table' ? `Package: ${packageName}` : 'Guest List Request',
          instagram ? `IG: @${instagram.replace('@', '')}` : '',
          notes || '',
        ].filter(Boolean).join(' | ')
      );

      db.prepare('UPDATE partner_events SET attendees = attendees + ? WHERE id = ?').run(partySize || 1, eventId);

      return NextResponse.json({
        success: true,
        code,
        bookingId: result.lastInsertRowid,
        message: type === 'table'
          ? 'Table reservation request submitted.'
          : 'You have been added to the guest list.',
      });

    } finally {
      db.close();
    }

  } catch (error: any) {
    console.error('NightLink reserve error:', error);
    return NextResponse.json({ error: 'Failed to process reservation' }, { status: 500 });
  }
}
