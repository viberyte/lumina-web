import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// POST - Register new promoter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, instagram_handle, bio, user_id } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    // Check if email exists
    const existing = db.prepare('SELECT id FROM promoters WHERE email = ?').get(email);
    if (existing) {
      db.close();
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const result = db.prepare(`
      INSERT INTO promoters (user_id, name, email, phone, instagram_handle, bio)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user_id || null, name, email, phone || null, instagram_handle || null, bio || null);

    const promoter = db.prepare('SELECT * FROM promoters WHERE id = ?').get(result.lastInsertRowid);

    db.close();

    return NextResponse.json({
      success: true,
      promoter
    });

  } catch (error) {
    console.error('Error registering promoter:', error);
    return NextResponse.json({ error: 'Failed to register promoter' }, { status: 500 });
  }
}

// GET - Get promoter by ID or email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id && !email) {
      return NextResponse.json({ error: 'id or email required' }, { status: 400 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    let promoter;
    if (id) {
      promoter = db.prepare('SELECT * FROM promoters WHERE id = ?').get(id);
    } else {
      promoter = db.prepare('SELECT * FROM promoters WHERE email = ?').get(email);
    }

    if (!promoter) {
      db.close();
      return NextResponse.json({ error: 'Promoter not found' }, { status: 404 });
    }

    // Get their venues
    const venues = db.prepare(`
      SELECT v.id, v.name, v.address, v.city, v.image_url, pv.role, pv.is_primary, pv.approved
      FROM promoter_venues pv
      JOIN venues v ON pv.venue_id = v.id
      WHERE pv.promoter_id = ?
    `).all(promoter.id);

    db.close();

    return NextResponse.json({
      success: true,
      promoter: { ...promoter, venues }
    });

  } catch (error) {
    console.error('Error fetching promoter:', error);
    return NextResponse.json({ error: 'Failed to fetch promoter' }, { status: 500 });
  }
}
