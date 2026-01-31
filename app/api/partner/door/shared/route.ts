import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data/lumina.db');

async function getDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

// GET - Verify a door token and get venue info
export async function GET(request: NextRequest) {
  try {
    // Support both header (preferred) and query param
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }
    
    const db = await getDb();
    
    const doorToken = await db.get(`
      SELECT dt.*, v.name as venue_name, v.id as venue_id
      FROM door_tokens dt
      JOIN venues v ON dt.venue_id = v.id
      WHERE dt.token = ? 
        AND dt.is_active = 1
        AND (dt.expires_at IS NULL OR dt.expires_at > datetime('now'))
    `, [token]);
    
    if (!doorToken) {
      await db.close();
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    // Update last used
    await db.run(
      `UPDATE door_tokens SET last_used_at = datetime('now') WHERE id = ?`,
      [doorToken.id]
    );
    
    await db.close();
    
    return NextResponse.json({
      valid: true,
      venue_id: doorToken.venue_id,
      venue_name: doorToken.venue_name,
      staff_name: doorToken.name
    });
    
  } catch (error) {
    console.error('Door token verify error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create a new door token (partners only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const partnerToken = authHeader.split(' ')[1];
    const db = await getDb();
    
    // Verify partner
    const session = await db.get(`
      SELECT ps.*, p.id as partner_id
      FROM partner_sessions ps
      JOIN partners p ON ps.partner_id = p.id
      WHERE ps.token = ? AND ps.expires_at > datetime('now')
    `, [partnerToken]);
    
    if (!session) {
      await db.close();
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const body = await request.json();
    const { venue_id, name = 'Door Staff', expires_in_days } = body;
    
    if (!venue_id) {
      await db.close();
      return NextResponse.json({ error: 'venue_id required' }, { status: 400 });
    }
    
    // Verify partner has access to venue
    const hasAccess = await db.get(
      `SELECT 1 FROM partner_venues WHERE partner_id = ? AND venue_id = ?`,
      [session.partner_id, venue_id]
    );
    
    if (!hasAccess) {
      await db.close();
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Generate unique token
    const doorToken = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiry
    let expiresAt = null;
    if (expires_in_days) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expires_in_days);
      expiresAt = expiry.toISOString();
    }
    
    // Create token
    await db.run(`
      INSERT INTO door_tokens (venue_id, token, name, created_by, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [venue_id, doorToken, name, session.partner_id, expiresAt]);
    
    await db.close();
    
    const shareLink = `https://lumina.viberyte.com/door/${doorToken}`;
    
    return NextResponse.json({
      success: true,
      token: doorToken,
      share_link: shareLink,
      name,
      expires_at: expiresAt
    });
    
  } catch (error) {
    console.error('Door token create error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Revoke a door token (any partner with venue access)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const partnerToken = authHeader.split(' ')[1];
    const db = await getDb();
    
    const session = await db.get(`
      SELECT ps.*, p.id as partner_id
      FROM partner_sessions ps
      JOIN partners p ON ps.partner_id = p.id
      WHERE ps.token = ? AND ps.expires_at > datetime('now')
    `, [partnerToken]);
    
    if (!session) {
      await db.close();
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('id');
    
    if (!tokenId) {
      await db.close();
      return NextResponse.json({ error: 'Token ID required' }, { status: 400 });
    }
    
    // Allow delete if partner owns the venue (not just if they created token)
    const result = await db.run(`
      UPDATE door_tokens 
      SET is_active = 0 
      WHERE id = ? 
        AND venue_id IN (
          SELECT venue_id FROM partner_venues WHERE partner_id = ?
        )
    `, [tokenId, session.partner_id]);
    
    await db.close();
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Token not found or access denied' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Door token delete error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
