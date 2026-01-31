import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/lumina.db');

async function getDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const db = await getDb();
    
    // Verify partner
    const session = await db.get(
      `SELECT ps.*, p.id as partner_id
       FROM partner_sessions ps
       JOIN partners p ON ps.partner_id = p.id
       WHERE ps.token = ? AND ps.expires_at > datetime('now')`,
      [token]
    );
    
    if (!session) {
      await db.close();
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Get Instagram connection
    const instagram = await db.get(
      `SELECT * FROM partner_instagram WHERE partner_id = ?`,
      [session.partner_id]
    );
    
    if (!instagram) {
      await db.close();
      return NextResponse.json({ connected: false });
    }
    
    // Check if token is expired
    const isExpired = new Date(instagram.expires_at) < new Date();
    
    await db.close();
    
    return NextResponse.json({
      connected: true,
      username: instagram.username,
      account_type: instagram.account_type,
      media_count: instagram.media_count,
      connected_at: instagram.connected_at,
      expires_at: instagram.expires_at,
      is_expired: isExpired
    });
    
  } catch (error) {
    console.error('Instagram profile error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
