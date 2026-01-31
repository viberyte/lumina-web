import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// POST - Link Instagram handle to user account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, instagram_handle } = body;

    // TODO: Replace with real auth - verify request is from authenticated user
    // For now, require user_id but this MUST be replaced with session/JWT
    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!instagram_handle) {
      return NextResponse.json({ error: 'instagram_handle required' }, { status: 400 });
    }

    // Normalize Instagram handle (remove @ if present, lowercase)
    const normalizedHandle = instagram_handle
      .replace(/^@/, '')
      .toLowerCase()
      .trim();

    // Validate format (basic check)
    if (!/^[a-z0-9._]{1,30}$/.test(normalizedHandle)) {
      return NextResponse.json({ 
        error: 'Invalid Instagram handle format',
        code: 'INVALID_FORMAT'
      }, { status: 400 });
    }

    // Check if user exists - NEVER create users here
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    // Check if handle is already used by another user
    const existing = db.prepare(`
      SELECT id FROM users 
      WHERE instagram_handle = ? AND id != ?
    `).get(normalizedHandle, user_id) as any;

    if (existing) {
      return NextResponse.json({ 
        error: 'This Instagram handle is already linked to another account',
        code: 'HANDLE_IN_USE'
      }, { status: 409 });
    }

    // Update existing user only
    db.prepare(`
      UPDATE users 
      SET instagram_handle = ?,
          instagram_verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(normalizedHandle, user_id);

    // Get updated user
    const updatedUser = db.prepare(`
      SELECT id, email, name, instagram_handle, instagram_verified_at
      FROM users WHERE id = ?
    `).get(user_id);

    return NextResponse.json({ 
      success: true,
      message: 'Instagram linked successfully',
      user: updatedUser
    });

  } catch (error: any) {
    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ 
        error: 'This Instagram handle is already linked to another account',
        code: 'HANDLE_IN_USE'
      }, { status: 409 });
    }
    console.error('Link Instagram error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Check if user has Instagram linked
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // TODO: Replace with real auth
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = db.prepare(`
      SELECT id, instagram_handle, instagram_verified_at
      FROM users WHERE id = ?
    `).get(userId) as any;

    if (!user) {
      return NextResponse.json({ 
        has_instagram: false,
        instagram_handle: null,
        user_exists: false
      });
    }

    return NextResponse.json({ 
      has_instagram: !!user.instagram_handle,
      instagram_handle: user.instagram_handle,
      verified_at: user.instagram_verified_at,
      user_exists: true
    });

  } catch (error: any) {
    console.error('Check Instagram error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Unlink Instagram from account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // TODO: Replace with real auth
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE users 
      SET instagram_handle = NULL,
          instagram_verified_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(userId);

    return NextResponse.json({ 
      success: true,
      message: 'Instagram unlinked'
    });

  } catch (error: any) {
    console.error('Unlink Instagram error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
