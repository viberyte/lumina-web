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
    
    // Check if user has a partner account
    const partner = db.prepare(`
      SELECT id, status FROM partners 
      WHERE id = ?
    `).get(params.id);

    db.close();

    if (!partner) {
      return NextResponse.json({
        is_partner: false,
        has_pending_application: false,
      }, { headers: corsHeaders });
    }

    return NextResponse.json({
      is_partner: (partner as any).status === 'approved',
      has_pending_application: (partner as any).status === 'pending',
      partner_id: (partner as any).id,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Partner status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
