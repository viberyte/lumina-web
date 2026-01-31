import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// GET - Get single layout with zones
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const layoutId = parseInt(params.id);

    if (isNaN(layoutId)) {
      return NextResponse.json({ error: 'Invalid layout ID' }, { status: 400 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    const layout = db.prepare(`
      SELECT l.*, v.name as venue_name, p.name as promoter_name
      FROM venue_layouts l
      JOIN venues v ON l.venue_id = v.id
      JOIN promoters p ON l.promoter_id = p.id
      WHERE l.id = ?
    `).get(layoutId) as any;

    if (!layout) {
      db.close();
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    const zones = db.prepare('SELECT * FROM layout_zones WHERE layout_id = ? ORDER BY sort_order').all(layoutId);

    db.close();

    return NextResponse.json({
      success: true,
      layout: { ...layout, zones }
    });

  } catch (error) {
    console.error('Error fetching layout:', error);
    return NextResponse.json({ error: 'Failed to fetch layout' }, { status: 500 });
  }
}

// PATCH - Update layout or zones
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const layoutId = parseInt(params.id);
    const body = await request.json();
    const { name, is_active, zones } = body;

    if (isNaN(layoutId)) {
      return NextResponse.json({ error: 'Invalid layout ID' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const layout = db.prepare('SELECT * FROM venue_layouts WHERE id = ?').get(layoutId) as any;
    if (!layout) {
      db.close();
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    // Update layout name/status
    if (name !== undefined || is_active !== undefined) {
      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);

        // If activating, deactivate others
        if (is_active) {
          db.prepare('UPDATE venue_layouts SET is_active = 0 WHERE venue_id = ? AND id != ?').run(layout.venue_id, layoutId);
        }
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(layoutId);

      db.prepare(`UPDATE venue_layouts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    // Update zones if provided
    if (zones && Array.isArray(zones)) {
      // Delete existing zones
      db.prepare('DELETE FROM layout_zones WHERE layout_id = ?').run(layoutId);

      // Insert new zones
      const insertZone = db.prepare(`
        INSERT INTO layout_zones (
          layout_id, zone_type, name, capacity_min, capacity_max,
          minimum_spend, price, notes, position_x, position_y,
          width, height, color, is_vip, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      zones.forEach((zone, index) => {
        insertZone.run(
          layoutId,
          zone.zone_type || 'zone',
          zone.name || `Zone ${index + 1}`,
          zone.capacity_min || 1,
          zone.capacity_max || 10,
          zone.minimum_spend || null,
          zone.price || null,
          zone.notes || null,
          zone.position_x || 0,
          zone.position_y || 0,
          zone.width || 100,
          zone.height || 100,
          zone.color || '#3B82F6',
          zone.is_vip ? 1 : 0,
          zone.sort_order ?? index
        );
      });
    }

    // Fetch updated layout
    const updatedLayout = db.prepare('SELECT * FROM venue_layouts WHERE id = ?').get(layoutId);
    const updatedZones = db.prepare('SELECT * FROM layout_zones WHERE layout_id = ? ORDER BY sort_order').all(layoutId);

    db.close();

    return NextResponse.json({
      success: true,
      layout: { ...updatedLayout, zones: updatedZones }
    });

  } catch (error) {
    console.error('Error updating layout:', error);
    return NextResponse.json({ error: 'Failed to update layout' }, { status: 500 });
  }
}

// DELETE - Delete layout
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const layoutId = parseInt(params.id);

    if (isNaN(layoutId)) {
      return NextResponse.json({ error: 'Invalid layout ID' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const layout = db.prepare('SELECT * FROM venue_layouts WHERE id = ?').get(layoutId) as any;
    if (!layout) {
      db.close();
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    // Delete zones first
    db.prepare('DELETE FROM layout_zones WHERE layout_id = ?').run(layoutId);

    // Delete layout
    db.prepare('DELETE FROM venue_layouts WHERE id = ?').run(layoutId);

    db.close();

    return NextResponse.json({
      success: true,
      deleted_layout_id: layoutId,
      deleted_layout_name: layout.name
    });

  } catch (error) {
    console.error('Error deleting layout:', error);
    return NextResponse.json({ error: 'Failed to delete layout' }, { status: 500 });
  }
}
