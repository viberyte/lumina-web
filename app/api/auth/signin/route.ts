import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
  
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Look up user in database
    const user = db.prepare(`
      SELECT id, email, name, password_hash, instagram_handle, instagram_verified_at, created_at
      FROM users
      WHERE LOWER(email) = LOWER(?)
    `).get(email) as any;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const passwordHash = hashPassword(password);
    
    if (passwordHash !== user.password_hash) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken();
    
    // Calculate expiry (7 days)
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Save session to database
    db.prepare(`
      INSERT INTO user_sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(user.id, token, tokenExpiry);

    console.log('✅ User signed in:', { userId: user.id, email: user.email });

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
      instagramHandle: user.instagram_handle,
      instagramVerified: !!user.instagram_verified_at,
      token,
      refreshToken: token, // Mobile expects this, use same token for now
    });

  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: 'Sign in failed' },
      { status: 500 }
    );
  } finally {
    db.close();
  }
}
