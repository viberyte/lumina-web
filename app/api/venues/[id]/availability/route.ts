import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (isNaN(venueId)) {
      return NextResponse.json({ error: 'Invalid venue ID' }, { status: 400 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    const venue = db.prepare('SELECT id, name FROM venues WHERE id = ?').get(venueId) as any;
    if (!venue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const schedule = db.prepare(`
      SELECT * FROM venue_availability WHERE venue_id = ? ORDER BY day_of_week
    `).all(venueId);

    const tables = db.prepare(`
      SELECT * FROM venue_tables WHERE venue_id = ? AND is_active = 1 ORDER BY section, table_name
    `).all(venueId);

    let bookedTables: number[] = [];
    let dayAvailability = null;

    if (date) {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      dayAvailability = schedule.find((s: any) => s.day_of_week === dayOfWeek);

      const bookedTableResults = db.prepare(`
        SELECT tb.table_id FROM table_bookings tb
        JOIN bookings b ON tb.booking_id = b.id
        WHERE b.venue_id = ? AND b.booking_date = ? AND b.status IN ('pending', 'confirmed')
      `).all(venueId, date) as any[];

      bookedTables = bookedTableResults.map((t: any) => t.table_id);
    }

    const feeConfig = db.prepare(`SELECT * FROM venue_fee_config WHERE venue_id = ?`).get(venueId);

    db.close();

    const tablesWithAvailability = tables.map((table: any) => ({
      ...table,
      is_available: !bookedTables.includes(table.id)
    }));

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      venue_name: venue.name,
      date: date || null,
      day_availability: dayAvailability,
      weekly_schedule: schedule,
      tables: tablesWithAvailability,
      available_tables: tablesWithAvailability.filter((t: any) => t.is_available).length,
      total_tables: tables.length,
      fee_config: feeConfig || { platform_fee_percentage: 10, service_fee_percentage: 5 }
    });

  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    const body = await request.json();
    const { schedule } = body;

    if (isNaN(venueId)) {
      return NextResponse.json({ error: 'Invalid venue ID' }, { status: 400 });
    }

    if (!schedule || !Array.isArray(schedule)) {
      return NextResponse.json({ error: 'Schedule array required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const venue = db.prepare('SELECT id FROM venues WHERE id = ?').get(venueId);
    if (!venue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const upsertStmt = db.prepare(`
      INSERT INTO venue_availability (
        venue_id, day_of_week, open_time, close_time, max_capacity, tables_available,
        guest_list_enabled, table_service_enabled, booking_enabled, minimum_spend,
        deposit_required, deposit_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (venue_id, day_of_week) DO UPDATE SET
        open_time = excluded.open_time, close_time = excluded.close_time,
        max_capacity = excluded.max_capacity, tables_available = excluded.tables_available,
        guest_list_enabled = excluded.guest_list_enabled, table_service_enabled = excluded.table_service_enabled,
        booking_enabled = excluded.booking_enabled, minimum_spend = excluded.minimum_spend,
        deposit_required = excluded.deposit_required, deposit_percentage = excluded.deposit_percentage,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const day of schedule) {
      upsertStmt.run(
        venueId, day.day_of_week, day.open_time || null, day.close_time || null,
        day.max_capacity || null, day.tables_available || null,
        day.guest_list_enabled ? 1 : 0, day.table_service_enabled ? 1 : 0,
        day.booking_enabled !== false ? 1 : 0, day.minimum_spend || null,
        day.deposit_required ? 1 : 0, day.deposit_percentage || 20
      );
    }

    db.close();

    return NextResponse.json({ success: true, venue_id: venueId, days_updated: schedule.length });

  } catch (error) {
    console.error('Error setting availability:', error);
    return NextResponse.json({ error: 'Failed to set availability' }, { status: 500 });
  }
}
