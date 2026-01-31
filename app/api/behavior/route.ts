import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VALID_ACTIONS = ['view', 'save', 'unsave', 'share', 'directions', 'call', 'skip', 'book'];

// Context is now flexible - allows granular tracking like:
// explore_rooftop_vibes, explore_dining_italian, explore_todays_moves, etc.
// Legacy contexts still work: explore, search, next_stop, chat, trip, favorites, detail

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST - Log a behavior event
export async function POST(request: NextRequest) {
  let db: any = null;
  
  try {
    const body = await request.json();
    
    const userId = Number(body.user_id);
    const venueId = Number(body.venue_id);
    const action = body.action;
    const context = body.context || null;
    const sessionId = body.session_id || null;
    
    // Validate required fields
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Invalid user_id' }, { status: 400, headers: corsHeaders });
    }
    if (!Number.isInteger(venueId) || venueId <= 0) {
      return NextResponse.json({ error: 'Invalid venue_id' }, { status: 400, headers: corsHeaders });
    }
    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400, headers: corsHeaders });
    }
    
    // Context validation: allow any string up to 100 chars
    // This enables granular tracking: explore_rooftop_vibes, explore_dining_italian, etc.
    if (context && (typeof context !== 'string' || context.length > 100)) {
      return NextResponse.json({ error: 'Context must be a string under 100 characters' }, { status: 400, headers: corsHeaders });
    }
    
    db = new Database(dbPath);
    
    // Verify venue exists
    const venue = db.prepare(`SELECT id, name FROM venues WHERE id = ?`).get(venueId);
    if (!venue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404, headers: corsHeaders });
    }
    
    // Insert behavior record
    const stmt = db.prepare(`
      INSERT INTO member_behavior (user_id, venue_id, action, context, session_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, venueId, action, context, sessionId);
    
    db.close();
    
    return NextResponse.json({
      success: true,
      behavior_id: result.lastInsertRowid,
      recorded: {
        user_id: userId,
        venue_id: venueId,
        venue_name: venue.name,
        action,
        context,
        session_id: sessionId
      }
    }, { headers: corsHeaders });
    
  } catch (err) {
    console.error('[API /behavior] POST Error:', err);
    if (db) db.close();
    return NextResponse.json({ error: 'Failed to log behavior' }, { status: 500, headers: corsHeaders });
  }
}

// GET - Retrieve user behavior history
export async function GET(request: NextRequest) {
  let db: any = null;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = Number(searchParams.get('user_id'));
    const action = searchParams.get('action');
    const contextPrefix = searchParams.get('context_prefix'); // Filter by context prefix
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
    
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Invalid user_id' }, { status: 400, headers: corsHeaders });
    }
    
    db = new Database(dbPath, { readonly: true });
    
    let query = `
      SELECT 
        mb.id, mb.venue_id, mb.action, mb.context, mb.session_id, mb.created_at,
        v.name as venue_name, v.category, v.neighborhood
      FROM member_behavior mb
      JOIN venues v ON v.id = mb.venue_id
      WHERE mb.user_id = ?
    `;
    const params: any[] = [userId];
    
    if (action && VALID_ACTIONS.includes(action)) {
      query += ` AND mb.action = ?`;
      params.push(action);
    }
    
    // Filter by context prefix (e.g., context_prefix=explore_dining)
    if (contextPrefix) {
      query += ` AND mb.context LIKE ?`;
      params.push(`${contextPrefix}%`);
    }
    
    query += ` ORDER BY mb.created_at DESC LIMIT ?`;
    params.push(limit);
    
    const behaviors = db.prepare(query).all(...params);
    
    // Get summary stats
    const stats = db.prepare(`
      SELECT 
        action,
        COUNT(*) as count
      FROM member_behavior
      WHERE user_id = ?
      GROUP BY action
    `).all(userId);
    
    // Get context breakdown
    const contextStats = db.prepare(`
      SELECT 
        context,
        COUNT(*) as count
      FROM member_behavior
      WHERE user_id = ?
      GROUP BY context
      ORDER BY count DESC
      LIMIT 20
    `).all(userId);
    
    db.close();
    
    return NextResponse.json({
      user_id: userId,
      total: behaviors.length,
      stats: stats.reduce((acc: any, s: any) => { acc[s.action] = s.count; return acc; }, {}),
      context_breakdown: contextStats,
      behaviors
    }, { headers: corsHeaders });
    
  } catch (err) {
    console.error('[API /behavior] GET Error:', err);
    if (db) db.close();
    return NextResponse.json({ error: 'Failed to fetch behaviors' }, { status: 500, headers: corsHeaders });
  }
}
