import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'lumina.db');

// GET - Get user's saved items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const itemType = searchParams.get('type'); // 'venue' or 'event' or null for all
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  
  const db = new Database(dbPath);
  
  try {
    let query = `
      SELECT s.id, s.item_type, s.item_id, s.created_at
      FROM saved_items s
      WHERE s.user_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (itemType) {
      query += ' AND s.item_type = ?';
      params.push(itemType);
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const savedItems = db.prepare(query).all(...params);
    
    // Fetch full details for each saved item
    const itemsWithDetails = savedItems.map((item: any) => {
      if (item.item_type === 'venue') {
        const venue = db.prepare(`
          SELECT id, name, category, cuisine, neighborhood, city, 
                 image_url, rating, price_tier, vibe_tags
          FROM venues WHERE id = ?
        `).get(item.item_id);
        return { ...item, details: venue };
      } else {
        const event = db.prepare(`
          SELECT id, name, venue_name, date, event_date, city,
                 image_url, cover_image_url, music_genre
          FROM events WHERE id = ?
        `).get(item.item_id);
        return { ...item, details: event };
      }
    });
    
    return NextResponse.json({
      saved: itemsWithDetails,
      count: itemsWithDetails.length
    });
    
  } catch (error: any) {
    console.error('Favorites GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch favorites',
      message: error.message 
    }, { status: 500 });
  } finally {
    db.close();
  }
}

// POST - Save an item
export async function POST(request: NextRequest) {
  const db = new Database(dbPath);
  
  try {
    const body = await request.json();
    const { userId, itemType, itemId } = body;
    
    if (!userId || !itemType || !itemId) {
      return NextResponse.json({ 
        error: 'userId, itemType, and itemId required' 
      }, { status: 400 });
    }
    
    if (!['venue', 'event'].includes(itemType)) {
      return NextResponse.json({ 
        error: 'itemType must be "venue" or "event"' 
      }, { status: 400 });
    }
    
    // Insert or ignore if already exists
    const result = db.prepare(`
      INSERT OR IGNORE INTO saved_items (user_id, item_type, item_id)
      VALUES (?, ?, ?)
    `).run(userId, itemType, itemId);
    
    return NextResponse.json({
      success: true,
      saved: result.changes > 0,
      message: result.changes > 0 ? 'Item saved' : 'Item already saved'
    });
    
  } catch (error: any) {
    console.error('Favorites POST error:', error);
    return NextResponse.json({ 
      error: 'Failed to save item',
      message: error.message 
    }, { status: 500 });
  } finally {
    db.close();
  }
}

// DELETE - Remove saved item
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const itemType = searchParams.get('itemType');
  const itemId = searchParams.get('itemId');
  
  if (!userId || !itemType || !itemId) {
    return NextResponse.json({ 
      error: 'userId, itemType, and itemId required' 
    }, { status: 400 });
  }
  
  const db = new Database(dbPath);
  
  try {
    const result = db.prepare(`
      DELETE FROM saved_items 
      WHERE user_id = ? AND item_type = ? AND item_id = ?
    `).run(userId, itemType, itemId);
    
    return NextResponse.json({
      success: true,
      removed: result.changes > 0,
      message: result.changes > 0 ? 'Item removed' : 'Item not found'
    });
    
  } catch (error: any) {
    console.error('Favorites DELETE error:', error);
    return NextResponse.json({ 
      error: 'Failed to remove item',
      message: error.message 
    }, { status: 500 });
  } finally {
    db.close();
  }
}
