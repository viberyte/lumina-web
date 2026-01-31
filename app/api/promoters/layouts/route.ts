import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promoter_id, venue_id, name, zones } = body;

    if (!promoter_id || !venue_id) {
      return NextResponse.json({ error: 'promoter_id and venue_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const claim = db.prepare('SELECT id FROM promoter_venues WHERE promoter_id = ? AND venue_id = ?').get(promoter_id, venue_id);
    if (!claim) {
      db.close();
      return NextResponse.json({ error: 'Promoter does not have access to this venue' }, { status: 403 });
    }

    db.prepare('UPDATE venue_layouts SET is_active = 0 WHERE venue_id = ? AND promoter_id = ?').run(venue_id, promoter_id);

    const layoutResult = db.prepare(`
      INSERT INTO venue_layouts (venue_id, promoter_id, name, is_active) VALUES (?, ?, ?, 1)
    `).run(venue_id, promoter_id, name || 'Main Layout');

    const layoutId = layoutResult.lastInsertRowid;

    const addedZones: any[] = [];
    if (zones && Array.isArray(zones)) {
      const insertZone = db.prepare(`
        INSERT INTO layout_zones (layout_id, zone_type, name, capacity_min, capacity_max, minimum_spend, price, notes, position_x, position_y, width, height, color, is_vip, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      zones.forEach((zone, index) => {
        const result = insertZone.run(
          layoutId, zone.zone_type || 'zone', zone.name || `Zone ${index + 1}`,
          zone.capacity_min || 1, zone.capacity_max || 10, zone.minimum_spend || null,
          zone.price || null, zone.notes || null, zone.position_x || 0, zone.position_y || 0,
          zone.width || 100, zone.height || 100, zone.color || '#3B82F6', zone.is_vip ? 1 : 0, zone.sort_order || index
        );
        addedZones.push({ id: result.lastInsertRowid, ...zone });
      });
    }

    db.close();

    return NextResponse.json({ success: true, layout: { id: layoutId, venue_id, promoter_id, name: name || 'Main Layout', is_active: true, zones: addedZones } });

  } catch (error) {
    console.error('Error creating layout:', error);
    return NextResponse.json({ error: 'Failed to create layout' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venue_id');
    const promoterId = searchParams.get('promoter_id');
    const layoutId = searchParams.get('layout_id');

    const db = new Database(DB_PATH, { readonly: true });

    if (layoutId) {
      const layout = db.prepare('SELECT * FROM venue_layouts WHERE id = ?').get(layoutId) as any;
      if (!layout) {
        db.close();
        return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
      }
      const zones = db.prepare('SELECT * FROM layout_zones WHERE layout_id = ? ORDER BY sort_order').all(layoutId);
      db.close();
      return NextResponse.json({ success: true, layout: { ...layout, zones } });
    }

    if (!venueId) {
      db.close();
      return NextResponse.json({ error: 'venue_id or layout_id required' }, { status: 400 });
    }

    let query = 'SELECT * FROM venue_layouts WHERE venue_id = ?';
    const params: any[] = [venueId];

    if (promoterId) {
      query += ' AND promoter_id = ?';
      params.push(promoterId);
    }

    query += ' ORDER BY is_active DESC, created_at DESC';

    const layouts = db.prepare(query).all(...params) as any[];

    const layoutsWithZones = layouts.map((layout: any) => {
      const zones = db.prepare('SELECT * FROM layout_zones WHERE layout_id = ? ORDER BY sort_order').all(layout.id);
      return { ...layout, zones };
    });

    db.close();

    return NextResponse.json({ success: true, venue_id: venueId, total_layouts: layouts.length, layouts: layoutsWithZones });

  } catch (error) {
    console.error('Error fetching layouts:', error);
    return NextResponse.json({ error: 'Failed to fetch layouts' }, { status: 500 });
  }
}
