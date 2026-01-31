import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { checkPartnerTier } from '@/lib/tierCheck';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// GET: List partner's specials
export async function GET(request: NextRequest) {
  const userToken = request.cookies.get('user_token')?.value;
  
  // TIER CHECK: Spotlight+ only
  const tierCheck = checkPartnerTier(userToken, 'spotlight');
  if (!tierCheck.authorized) {
    return NextResponse.json(
      { error: tierCheck.error, requiredTier: 'spotlight', currentTier: tierCheck.tier },
      { status: 403 }
    );
  }

  try {
    const db = new Database(DB_PATH);

    const specials = db.prepare(`
      SELECT 
        vs.*,
        v.name as venue_name
      FROM venue_specials vs
      LEFT JOIN venues v ON vs.venue_id = v.id
      WHERE vs.partner_id = ?
      ORDER BY vs.created_at DESC
    `).all(tierCheck.partner.p_id);

    db.close();

    return NextResponse.json({ specials });

  } catch (error) {
    console.error('Specials error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Create a new special
export async function POST(request: NextRequest) {
  const userToken = request.cookies.get('user_token')?.value;
  
  // TIER CHECK: Spotlight+ only
  const tierCheck = checkPartnerTier(userToken, 'spotlight');
  if (!tierCheck.authorized) {
    return NextResponse.json(
      { error: tierCheck.error, requiredTier: 'spotlight', currentTier: tierCheck.tier },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { venue_id, title, description, discount_text, special_category, days_active, time_range } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    const result = db.prepare(`
      INSERT INTO venue_specials (
        partner_id, venue_id, title, description, discount_text, 
        special_category, days_active, time_range, active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(
      tierCheck.partner.p_id,
      venue_id || null,
      title,
      description || null,
      discount_text || null,
      special_category || null,
      JSON.stringify(days_active || []),
      time_range || null
    );

    db.close();

    return NextResponse.json({ 
      success: true, 
      special_id: result.lastInsertRowid 
    });

  } catch (error) {
    console.error('Create special error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
