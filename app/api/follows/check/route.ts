import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// GET - Check if user is following
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const followType = searchParams.get('follow_type');
    const followId = searchParams.get('follow_id');
    
    if (!userId || !followType || !followId) {
      return NextResponse.json({ error: 'user_id, follow_type, and follow_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    const existing = db.prepare(`
      SELECT id FROM user_follows 
      WHERE user_id = ? AND follow_type = ? AND follow_id = ?
    `).get(userId, followType, followId);

    db.close();

    return NextResponse.json({
      success: true,
      is_following: !!existing,
    });

  } catch (error) {
    console.error('Error checking follow:', error);
    return NextResponse.json({ error: 'Failed to check follow status' }, { status: 500 });
  }
}
