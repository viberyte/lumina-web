import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Normalize packages to consistent camelCase format for mobile
function normalizePackages(packages: any[]): any[] {
  return packages.map((pkg, i) => ({
    id: pkg.id || `pkg_${i}`,
    name: pkg.name || 'Table',
    description: pkg.description || '',
    bottleCount: pkg.bottleCount || pkg.bottle_count || 0,
    price: pkg.price || 0,
    maxGuests: pkg.maxGuests || pkg.max_guests || 6,
    sectionId: pkg.sectionId || pkg.section_id || null,
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

  try {
    const { id } = await params;

    // ── Step 1: Try partner_events first (promoted events with booking) ──
    let event = db.prepare(`
      SELECT 
        pe.*,
        pv.name as venue_name,
        pv.address as venue_address,
        pv.id as venue_id,
        p.id as partner_id,
        p.business_name as partner_name,
        p.instagram_handle as partner_instagram,
        p.profile_picture as partner_photo,
        p.venmo as partner_venmo,
        p.zelle as partner_zelle,
        p.cashapp as partner_cashapp
      FROM partner_events pe
      LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
      LEFT JOIN partners p ON pe.partner_id = p.id
      WHERE pe.id = ?
    `).get(id) as any;

    if (event) {
      // Parse JSON packages from column
      let packages: any[] = [];
      try {
        packages = event.packages ? JSON.parse(event.packages) : [];
      } catch (e) { packages = []; }

      // If no JSON packages, check event_packages table
      if (packages.length === 0) {
        const dbPackages = db.prepare(`
          SELECT id, name, description, bottle_count, price, section_id, max_guests
          FROM event_packages
          WHERE event_id = ?
          ORDER BY price ASC
        `).all(parseInt(id)) as any[];
        packages = dbPackages;
      }

      // Parse sections
      let sections: any[] = [];
      try {
        sections = event.sections ? JSON.parse(event.sections) : [];
      } catch (e) { sections = []; }

      // Parse lineup
      let lineup: string[] | null = null;
      if (event.lineup) {
        try {
          lineup = JSON.parse(event.lineup);
        } catch {
          lineup = event.lineup.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const normalizedPackages = normalizePackages(packages);

      return NextResponse.json({
        success: true,
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          eventDate: event.event_date,
          eventTime: event.event_time,
          date: event.event_date,
          time: event.event_time,
          endTime: event.end_time,
          genre: event.genre,
          imageUrl: event.image_url || event.cover_image_url,
          image_url: event.image_url || event.cover_image_url,
          ticket_url: event.ticket_url || null,
          status: event.status,
          city: event.city || '',
          lineup,
          door_time: event.door_time,
          dress_code: event.dress_code,
          age_restriction: event.age_restriction,
          venue: {
            id: event.venue_id,
            name: event.venue_name,
            address: event.venue_address,
          },
          partner: {
            id: event.partner_id,
            name: event.partner_name,
            instagram: event.partner_instagram,
            photo: event.partner_photo,
            paymentMethods: {
              venmo: event.partner_venmo || null,
              zelle: event.partner_zelle || null,
              cashapp: event.partner_cashapp || null,
            }
          },
          sections,
          packages: normalizedPackages,
          hasBookingOptions: normalizedPackages.length > 0 || sections.length > 0,
          bookingMode: normalizedPackages.length > 0 || sections.length > 0 ? 'request' : null,
        },
        source: 'partner_events'
      }, { headers: corsHeaders });
    }

    // ── Step 2: Check regular events table ──
    event = db.prepare(`
      SELECT * FROM events WHERE id = ?
    `).get(id) as any;

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if this scraped event links to a partner_event
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
          p.profile_picture as partner_photo,
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

        // Also check event_packages table
        if (packages.length === 0) {
          const dbPackages = db.prepare(`
            SELECT id, name, description, bottle_count, price, section_id, max_guests
            FROM event_packages
            WHERE event_id = ?
            ORDER BY price ASC
          `).all(event.partner_event_id) as any[];
          packages = dbPackages;
        }

        partner = {
          id: partnerEvent.partner_id,
          name: partnerEvent.partner_name,
          instagram: partnerEvent.partner_instagram,
          photo: partnerEvent.partner_photo,
          paymentMethods: {
            venmo: partnerEvent.partner_venmo || null,
            zelle: partnerEvent.partner_zelle || null,
            cashapp: partnerEvent.partner_cashapp || null,
          }
        };
      }
    }

    // Parse lineup
    let lineup: string[] | null = null;
    if (event.lineup) {
      try {
        lineup = JSON.parse(event.lineup);
      } catch {
        lineup = event.lineup.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const normalizedPackages = normalizePackages(packages);

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.name,
        description: event.description,
        eventDate: event.date,
        eventTime: event.time,
        date: event.date,
        time: event.time,
        genre: event.music_genre,
        imageUrl: event.image_url || event.cover_image_url,
        image_url: event.image_url || event.cover_image_url,
        ticket_url: event.ticket_url || null,
        city: event.city,
        lineup,
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
        packages: normalizedPackages,
        hasBookingOptions: normalizedPackages.length > 0 || sections.length > 0,
        bookingMode: normalizedPackages.length > 0 || sections.length > 0 ? 'request' : null,
      },
      source: 'events'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event' },
      { status: 500, headers: corsHeaders }
    );
  } finally {
    db.close();
  }
}
