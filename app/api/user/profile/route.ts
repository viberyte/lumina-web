import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = auth.slice(7);
  const db = new Database(DB_PATH);

  try {
    const session = db.prepare(`
      SELECT user_id FROM user_sessions
      WHERE token = ? AND expires_at > datetime('now')
    `).get(token) as any;

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = db.prepare(`
      SELECT 
        id,
        name,
        email,
        phone,
        instagram_handle,
        instagram_verified_at,
        created_at
      FROM users
      WHERE id = ?
    `).get(session.user_id) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        instagram_verified: !!user.instagram_verified_at,
      },
    });
  } finally {
    db.close();
  }
}
