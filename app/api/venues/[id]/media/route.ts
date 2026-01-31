export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'lumina.db');
    const db = new Database(dbPath);

    const media = db.prepare(`
      SELECT 
        id,
        media_url,
        media_type,
        instagram_url,
        caption,
        likes_count,
        comments_count,
        timestamp
      FROM venue_instagram_media
      WHERE venue_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `).all(params.id);

    db.close();

    return NextResponse.json(media, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching venue media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
