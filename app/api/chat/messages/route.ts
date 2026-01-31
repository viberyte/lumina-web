import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const room_slug = searchParams.get('room_slug');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!room_slug) {
      return NextResponse.json({ error: 'Missing room_slug' }, { status: 400, headers: corsHeaders });
    }

    const db = new Database(dbPath);
    const room = db.prepare('SELECT id FROM chat_rooms WHERE slug = ?').get(room_slug) as any;
    if (!room) {
      db.close();
      return NextResponse.json({ error: 'Room not found' }, { status: 404, headers: corsHeaders });
    }

    const messages = db.prepare(`
      SELECT m.*, p.business_name as partner_name, p.instagram_handle
      FROM chat_messages m
      LEFT JOIN partners p ON m.partner_id = p.id
      WHERE m.room_slug = ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `).all(room_slug, limit);

    db.close();

    return NextResponse.json({ 
      messages: messages.reverse(),
      room_slug 
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const { room_slug, user_id, partner_id, message_type, content } = await request.json();

    if (!room_slug || !content) {
      return NextResponse.json({ error: 'Missing room_slug or content' }, { status: 400, headers: corsHeaders });
    }

    const db = new Database(dbPath);
    
    // Verify room exists
    const room = db.prepare('SELECT id FROM chat_rooms WHERE slug = ?').get(room_slug) as any;
    if (!room) {
      db.close();
      return NextResponse.json({ error: 'Room not found' }, { status: 404, headers: corsHeaders });
    }

    // Insert message
    const result = db.prepare(`
      INSERT INTO chat_messages (room_slug, user_id, partner_id, content, message_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(room_slug, user_id || null, partner_id || null, content, message_type || 'community_text');

    const newMessage = db.prepare(`
      SELECT m.*, p.business_name as partner_name, p.instagram_handle
      FROM chat_messages m
      LEFT JOIN partners p ON m.partner_id = p.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);

    db.close();

    return NextResponse.json({ 
      message: newMessage,
      success: true 
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Post message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
