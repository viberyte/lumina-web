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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = new Database(dbPath);
    
    // Get upcoming events for this partner
    const events = db.prepare(`
      SELECT id, name, start_date as date, venue_name, flyer_image_url as flyer_url
      FROM events
      WHERE promoter_id = ? AND start_date >= date('now')
      ORDER BY start_date ASC
      LIMIT 10
    `).all(params.id);

    db.close();

    return NextResponse.json({ events }, { headers: corsHeaders });
  } catch (error) {
    console.error('Get partner events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
