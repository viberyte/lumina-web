import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code required' },
        { status: 400 }
      );
    }

    const user = db.prepare(`
      SELECT id, name, email, verification_code, verification_expires_at, email_verified
      FROM users WHERE email = ?
    `).get(email.toLowerCase()) as any;

    if (!user) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (user.email_verified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    if (!user.verification_code) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    if (user.verification_code !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    if (new Date(user.verification_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Generate fresh tokens
    const authToken = generateToken();
    const refreshToken = generateToken();

    // Verify user, null out code (one-time use), store hashed tokens
    db.prepare(`
      UPDATE users 
      SET email_verified = 1, 
          verification_code = NULL, 
          verification_expires_at = NULL,
          auth_token_hash = ?, 
          refresh_token_hash = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(hashToken(authToken), hashToken(refreshToken), user.id);

    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      name: user.name,
      emailVerified: true,
      token: authToken,
      refreshToken,
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
