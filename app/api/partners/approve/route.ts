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

export async function POST(request: Request) {
  try {
    const { partner_id, action, rejection_reason, admin_email, capabilities } = await request.json();

    if (!partner_id || !action || !admin_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = new Database(dbPath);
    const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partner_id) as any;

    if (!partner) {
      db.close();
      return NextResponse.json({ error: 'Partner not found' }, { status: 404, headers: corsHeaders });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      const defaultCaps = { post_events: true, edit_events: true, featured_boosts: false };
      db.prepare(`UPDATE partners SET status = 'approved', approved_at = ?, capabilities = ?, updated_at = ? WHERE id = ?`)
        .run(now, JSON.stringify(capabilities || defaultCaps), now, partner_id);
      
      db.prepare(`UPDATE partner_applications SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE partner_id = ?`)
        .run(admin_email, now, partner_id);
      
      db.close();
      return NextResponse.json({ success: true, message: 'Partner approved' }, { headers: corsHeaders });
    } else {
      db.prepare(`UPDATE partners SET status = 'rejected', rejected_at = ?, rejection_reason = ?, updated_at = ? WHERE id = ?`)
        .run(now, rejection_reason || 'Does not meet requirements', now, partner_id);
      
      db.prepare(`UPDATE partner_applications SET status = 'rejected', reviewed_by = ?, reviewed_at = ? WHERE partner_id = ?`)
        .run(admin_email, now, partner_id);
      
      db.close();
      return NextResponse.json({ success: true, message: 'Partner rejected' }, { headers: corsHeaders });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const db = new Database(dbPath);
    const partners = db.prepare(`
      SELECT p.*, pa.why_join, pa.sample_event_urls
      FROM partners p
      LEFT JOIN partner_applications pa ON p.id = pa.partner_id
      WHERE p.status = ?
      ORDER BY p.applied_at DESC
    `).all(status);
    db.close();
    return NextResponse.json({ status, count: partners.length, partners }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
