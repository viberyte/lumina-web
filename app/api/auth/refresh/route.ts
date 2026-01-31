import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function generateToken(userId: string): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    // For demo: just generate new token
    // In production: validate refresh token against DB
    const newToken = generateToken('user');

    return NextResponse.json({
      token: newToken,
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
