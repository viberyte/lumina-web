import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const normalizeHandle = (handle: string): string => {
  return handle.toLowerCase().replace(/^@/, '').trim();
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const normalizedHandle = normalizeHandle(body.instagram_handle);

    if (!normalizedHandle || !body.instagram_id || !body.business_name || !body.primary_genre) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
    }

    if (body.email && !isValidEmail(body.email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400, headers: corsHeaders });
    }

    const db = new Database(dbPath);
    const existing = db.prepare('SELECT id, status FROM partners WHERE instagram_handle = ?').get(normalizedHandle);
    
    if (existing) {
      db.close();
      return NextResponse.json({ error: 'Already applied', status: (existing as any).status }, { status: 409, headers: corsHeaders });
    }

    const result = db.prepare(`
      INSERT INTO partners (instagram_handle, instagram_id, business_name, email, phone, profile_picture, follower_count, primary_genre, secondary_genres, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(normalizedHandle, body.instagram_id, body.business_name, body.email || null, body.phone || null, body.profile_picture || null, body.follower_count || 0, body.primary_genre, JSON.stringify(body.secondary_genres || []));

    db.prepare(`INSERT INTO partner_applications (partner_id, instagram_handle, why_join, sample_event_urls, status) VALUES (?, ?, ?, ?, 'pending')`)
      .run(result.lastInsertRowid, normalizedHandle, body.why_join || '', JSON.stringify(body.sample_event_urls || []));

    db.close();

    return NextResponse.json({ success: true, message: 'Application submitted!', application_id: result.lastInsertRowid, status: 'pending' }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instagram_handle = searchParams.get('instagram_handle');
    if (!instagram_handle) return NextResponse.json({ error: 'Missing instagram_handle' }, { status: 400, headers: corsHeaders });

    const db = new Database(dbPath);
    const partner = db.prepare('SELECT id, instagram_handle, business_name, status, applied_at FROM partners WHERE instagram_handle = ?').get(normalizeHandle(instagram_handle));
    db.close();

    if (!partner) return NextResponse.json({ status: 'not_found' }, { headers: corsHeaders });
    return NextResponse.json(partner, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
