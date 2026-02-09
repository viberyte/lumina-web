import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const ADMIN_KEY = 'lumina-outreach-2026';

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
  const key = req.headers.get('authorization')?.replace('Bearer ', '');
  if (key !== ADMIN_KEY) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

  const db = new Database(path.join(process.cwd(), 'data', 'lumina.db'));
  try {
    const url = new URL(req.url);
    const city = url.searchParams.get('city');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    let where = 'WHERE p.is_demo = 1 AND p.source_venue_id IS NOT NULL';
    const params: any[] = [];

    if (city) { where += ' AND v.city = ?'; params.push(city); }
    if (status && status !== 'all') { where += ' AND p.outreach_status = ?'; params.push(status); }
    if (search) { where += ' AND (p.business_name LIKE ? OR p.instagram_handle LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const total = db.prepare(`SELECT COUNT(*) as count FROM partners p LEFT JOIN venues v ON v.id = p.source_venue_id ${where}`).get(...params) as any;

    const partners = db.prepare(`
      SELECT p.id, p.business_name, p.instagram_handle, p.outreach_status, p.claim_token,
             p.is_claimed, p.our_story,
             v.city, v.state, v.vibe_tags, v.music_genres, v.image_url,
             v.dress_code, v.price_range, v.price_tier
      FROM partners p
      LEFT JOIN venues v ON v.id = p.source_venue_id
      ${where}
      ORDER BY v.city, p.business_name
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    const cities = db.prepare(`
      SELECT v.city, v.state, COUNT(*) as count
      FROM partners p
      LEFT JOIN venues v ON v.id = p.source_venue_id
      WHERE p.is_demo = 1 AND p.source_venue_id IS NOT NULL AND v.city IS NOT NULL
      GROUP BY v.city, v.state
      ORDER BY count DESC
    `).all() as any[];

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN outreach_status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN outreach_status = 'opened' THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN outreach_status = 'claimed' OR is_claimed = 1 THEN 1 ELSE 0 END) as claimed,
        SUM(CASE WHEN outreach_status = 'none' OR outreach_status IS NULL THEN 1 ELSE 0 END) as pending
      FROM partners WHERE is_demo = 1 AND source_venue_id IS NOT NULL
    `).get() as any;

    return cors(NextResponse.json({
      partners,
      total: total.count,
      page,
      totalPages: Math.ceil(total.count / limit),
      cities,
      stats
    }));
  } finally {
    db.close();
  }
}

export async function PUT(req: NextRequest) {
  const key = req.headers.get('authorization')?.replace('Bearer ', '');
  if (key !== ADMIN_KEY) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

  const db = new Database(path.join(process.cwd(), 'data', 'lumina.db'));
  try {
    const { id, outreach_status } = await req.json();
    if (!id || !outreach_status) return cors(NextResponse.json({ error: 'Missing fields' }, { status: 400 }));

    const valid = ['none', 'sent', 'opened', 'claimed', 'active'];
    if (!valid.includes(outreach_status)) return cors(NextResponse.json({ error: 'Invalid status' }, { status: 400 }));

    db.prepare('UPDATE partners SET outreach_status = ? WHERE id = ?').run(outreach_status, id);
    return cors(NextResponse.json({ success: true }));
  } finally {
    db.close();
  }
}
