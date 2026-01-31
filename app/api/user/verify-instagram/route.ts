import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

export async function POST(request: NextRequest) {
  const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
  
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const token = authHeader.slice(7);
    
    // Resolve user from session
    const session = db.prepare(`
      SELECT user_id FROM user_sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `).get(token) as any;
    
    if (!session?.user_id) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    const userId = session.user_id;
    
    // Get Instagram handle from request
    const body = await request.json();
    const { instagramHandle } = body;
    
    if (!instagramHandle) {
      return NextResponse.json({ error: 'Instagram handle required' }, { status: 400 });
    }
    
    // Clean handle (remove @ if present)
    const cleanHandle = instagramHandle.trim().replace(/^@/, '').toLowerCase();
    
    if (cleanHandle.length < 2 || cleanHandle.length > 30) {
      return NextResponse.json({ error: 'Invalid Instagram handle' }, { status: 400 });
    }
    
    // Check if handle is already taken by another user
    const existing = db.prepare(`
      SELECT id FROM users 
      WHERE LOWER(instagram_handle) = ? AND id != ?
    `).get(cleanHandle, userId) as any;
    
    if (existing) {
      return NextResponse.json({ error: 'This Instagram handle is already linked to another account' }, { status: 409 });
    }
    
    // Update user with verified Instagram
    db.prepare(`
      UPDATE users 
      SET instagram_handle = ?, 
          instagram_verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanHandle, userId);
    
    console.log('✅ Instagram verified:', { userId, handle: cleanHandle });
    
    return NextResponse.json({ 
      success: true, 
      instagramHandle: cleanHandle,
      verifiedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Instagram verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  } finally {
    db.close();
  }
}
