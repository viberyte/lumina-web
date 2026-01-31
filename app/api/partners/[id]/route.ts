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
    
    const partner = db.prepare(`
      SELECT id, instagram_handle, business_name, status, follower_count, created_at
      FROM partners
      WHERE id = ?
    `).get(params.id);

    db.close();

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(partner, { headers: corsHeaders });
  } catch (error) {
    console.error('Get partner error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
