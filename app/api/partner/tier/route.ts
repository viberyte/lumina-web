import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// POST: Set free tier (claimed)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('user_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let db: Database.Database | null = null;

  try {
    const body = await request.json();
    const { tier } = body;

    if (tier !== 'claimed') {
      return NextResponse.json({ error: 'Use /api/partner/upgrade for paid tiers' }, { status: 400 });
    }

    db = new Database(DB_PATH);

    // Get user and partner info
    const user = db.prepare(`
      SELECT 
        u.id as user_id,
        u.partner_id,
        p.id as p_id,
        p.tier as current_tier
      FROM user_sessions us
      JOIN users u ON u.id = us.user_id
      LEFT JOIN partners p ON u.partner_id = p.id
      WHERE us.token = ? AND us.expires_at > datetime('now')
    `).get(token) as any;

    if (!user) {
      db.close();
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    if (!user.partner_id) {
      db.close();
      return NextResponse.json({ error: 'Not a partner' }, { status: 403 });
    }

    // Update tier to claimed
    db.prepare(`
      UPDATE partners SET 
        tier = 'claimed',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(user.p_id);

    db.close();

    return NextResponse.json({ 
      success: true,
      tier: 'claimed',
      message: 'Free tier activated'
    });

  } catch (error: any) {
    console.error('Tier error:', error);
    if (db) db.close();
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

// GET: Get current tier
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('user_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let db: Database.Database | null = null;

  try {
    db = new Database(DB_PATH);

    const user = db.prepare(`
      SELECT 
        p.tier,
        p.subscription_status,
        p.subscription_ends_at
      FROM user_sessions us
      JOIN users u ON u.id = us.user_id
      LEFT JOIN partners p ON u.partner_id = p.id
      WHERE us.token = ? AND us.expires_at > datetime('now')
    `).get(token) as any;

    db.close();

    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    return NextResponse.json({
      tier: user.tier || 'claimed',
      subscriptionStatus: user.subscription_status,
      subscriptionEndsAt: user.subscription_ends_at,
    });

  } catch (error: any) {
    console.error('Tier error:', error);
    if (db) db.close();
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
