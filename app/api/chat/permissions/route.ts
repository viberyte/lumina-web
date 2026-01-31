import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const partner_id = searchParams.get('partner_id');

    if (!partner_id) {
      return NextResponse.json(
        { error: 'Missing partner_id' },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = new Database(dbPath);
    
    const rooms = db.prepare(`
      SELECT 
        r.slug,
        r.name,
        r.city,
        p.can_post_events
      FROM chat_permissions p
      JOIN chat_rooms r ON p.room_slug = r.slug
      WHERE p.partner_id = ?
      ORDER BY r.city, r.name
    `).all(partner_id);

    db.close();

    return NextResponse.json({ rooms }, { headers: corsHeaders });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
