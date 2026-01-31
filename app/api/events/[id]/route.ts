import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
  
  try {
    const { id } = await params;

    // First try partner_events (promoted events with sections/bottles)
    let event = db.prepare(`
      SELECT 
        pe.*,
        pv.name as venue_name,
        pv.address as venue_address,
        pv.id as venue_id,
        p.id as partner_id,
        p.business_name as partner_name,
        p.instagram_handle as partner_instagram,
        p.venmo as partner_venmo,
        p.zelle as partner_zelle,
        p.cashapp as partner_cashapp
      FROM partner_events pe
      LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
      LEFT JOIN partners p ON pe.partner_id = p.id
      WHERE pe.id = ?
    `).get(id) as any;

    if (event) {
      let sections = [];
      let packages = [];
      
      try {
        sections = event.sections ? JSON.parse(event.sections) : [];
      } catch (e) { sections = []; }
      
      try {
        packages = event.packages ? JSON.parse(event.packages) : [];
      } catch (e) { packages = []; }

      return NextResponse.json({
        success: true,
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          eventDate: event.event_date,
          eventTime: event.event_time,
          endTime: event.end_time,
          genre: event.genre,
          imageUrl: event.image_url,
          ticket_url: event.ticket_url || null,
          status: event.status,
          venue: {
            id: event.venue_id,
            name: event.venue_name,
            address: event.venue_address,
          },
          partner: {
            id: event.partner_id,
            name: event.partner_name,
            instagram: event.partner_instagram,
            paymentMethods: {
              venmo: event.partner_venmo || null,
              zelle: event.partner_zelle || null,
              cashapp: event.partner_cashapp || null,
            }
          },
          sections,
          packages,
          hasBookingOptions: sections.length > 0 || packages.length > 0,
          bookingMode: 'request',
        },
        source: 'partner_events'
      });
    }

    // Check regular events table
    event = db.prepare(`
      SELECT * FROM events WHERE id = ?
    `).get(id) as any;

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if this event links to a partner_event
    let sections: any[] = [];
    let packages: any[] = [];
    let partner: any = null;

    if (event.partner_event_id) {
      const partnerEvent = db.prepare(`
        SELECT 
          pe.*,
          p.id as partner_id,
          p.business_name as partner_name,
          p.instagram_handle as partner_instagram,
          p.venmo as partner_venmo,
          p.zelle as partner_zelle,
          p.cashapp as partner_cashapp
        FROM partner_events pe
        LEFT JOIN partners p ON pe.partner_id = p.id
        WHERE pe.id = ?
      `).get(event.partner_event_id) as any;

      if (partnerEvent) {
        try {
          sections = partnerEvent.sections ? JSON.parse(partnerEvent.sections) : [];
        } catch (e) { sections = []; }
        
        try {
          packages = partnerEvent.packages ? JSON.parse(partnerEvent.packages) : [];
        } catch (e) { packages = []; }

        partner = {
          id: partnerEvent.partner_id,
          name: partnerEvent.partner_name,
          instagram: partnerEvent.partner_instagram,
          paymentMethods: {
            venmo: partnerEvent.partner_venmo || null,
            zelle: partnerEvent.partner_zelle || null,
            cashapp: partnerEvent.partner_cashapp || null,
          }
        };
      }
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.name,
        description: event.description,
        eventDate: event.date,
        eventTime: event.time,
        genre: event.music_genre,
        imageUrl: event.image_url || event.cover_image_url,
        ticket_url: event.ticket_url || null,
        city: event.city,
        lineup: event.lineup,
        why_recommended: event.why_recommended || event.why_go,
        crowd_type: event.crowd_type,
        peak_hours: event.peak_hours,
        venue: {
          id: event.venue_id,
          name: event.venue_name,
          address: event.venue_address,
        },
        partner,
        sections,
        packages,
        hasBookingOptions: sections.length > 0 || packages.length > 0,
        bookingMode: sections.length > 0 || packages.length > 0 ? 'request' : null,
      },
      source: 'events'
    });

  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  } finally {
    db.close();
  }
}
