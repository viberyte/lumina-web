import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('partner_token')?.value;
    if (token) {
      db.prepare('DELETE FROM partner_sessions WHERE token = ?').run(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('partner_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
