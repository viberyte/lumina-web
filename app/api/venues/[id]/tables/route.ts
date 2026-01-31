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

    if (isNaN(venueId)) {
      return NextResponse.json({ error: 'Invalid venue ID' }, { status: 400 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    const venue = db.prepare('SELECT id, name FROM venues WHERE id = ?').get(venueId) as any;
    if (!venue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const tables = db.prepare(`
      SELECT * FROM venue_tables WHERE venue_id = ? ORDER BY section, table_name
    `).all(venueId);

    const sections = db.prepare(`
      SELECT DISTINCT section FROM venue_tables WHERE venue_id = ? AND section IS NOT NULL
    `).all(venueId) as any[];

    db.close();

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      venue_name: venue.name,
      total_tables: tables.length,
      sections: sections.map((s: any) => s.section),
      tables
    });

  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    const body = await request.json();
    const { tables } = body;

    if (isNaN(venueId)) {
      return NextResponse.json({ error: 'Invalid venue ID' }, { status: 400 });
    }

    if (!tables || !Array.isArray(tables)) {
      return NextResponse.json({ error: 'Tables array required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const venue = db.prepare('SELECT id FROM venues WHERE id = ?').get(venueId);
    if (!venue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const insertStmt = db.prepare(`
      INSERT INTO venue_tables (venue_id, table_name, section, capacity_min, capacity_max, minimum_spend, premium_table, location_description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const addedTables: any[] = [];
    for (const table of tables) {
      if (!table.table_name || !table.capacity_max) continue;

      const result = insertStmt.run(
        venueId,
        table.table_name,
        table.section || null,
        table.capacity_min || 1,
        table.capacity_max,
        table.minimum_spend || null,
        table.premium_table ? 1 : 0,
        table.location_description || null,
        table.is_active !== false ? 1 : 0
      );

      addedTables.push({ id: result.lastInsertRowid, ...table });
    }

    db.close();

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      tables_added: addedTables.length,
      tables: addedTables
    });

  } catch (error) {
    console.error('Error adding tables:', error);
    return NextResponse.json({ error: 'Failed to add tables' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    const body = await request.json();
    const { table_id, updates } = body;

    if (isNaN(venueId)) {
      return NextResponse.json({ error: 'Invalid venue ID' }, { status: 400 });
    }

    if (!table_id || !updates) {
      return NextResponse.json({ error: 'table_id and updates required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const table = db.prepare('SELECT * FROM venue_tables WHERE id = ? AND venue_id = ?').get(table_id, venueId) as any;
    if (!table) {
      db.close();
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const allowedFields = ['table_name', 'section', 'capacity_min', 'capacity_max', 'minimum_spend', 'premium_table', 'location_description', 'is_active'];
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      db.close();
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(table_id);
    db.prepare(`UPDATE venue_tables SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updatedTable = db.prepare('SELECT * FROM venue_tables WHERE id = ?').get(table_id);
    db.close();

    return NextResponse.json({ success: true, table: updatedTable });

  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('table_id');

    if (isNaN(venueId)) {
      return NextResponse.json({ error: 'Invalid venue ID' }, { status: 400 });
    }

    if (!tableId) {
      return NextResponse.json({ error: 'table_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const table = db.prepare('SELECT * FROM venue_tables WHERE id = ? AND venue_id = ?').get(tableId, venueId) as any;
    if (!table) {
      db.close();
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Soft delete - just deactivate
    db.prepare('UPDATE venue_tables SET is_active = 0 WHERE id = ?').run(tableId);
    db.close();

    return NextResponse.json({ success: true, deleted_table_id: tableId, deleted_table_name: table.table_name });

  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}
