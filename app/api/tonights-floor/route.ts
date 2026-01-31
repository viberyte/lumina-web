import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// GET: Fetch tonight's live inventory (consumer-facing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || 'New York';
    const type = searchParams.get('type'); // 'table', 'bottle', 'deal', 'guestlist'
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = new Database(DB_PATH);

    let query = `
      SELECT 
        tf.*,
        v.name as venue_name,
        v.address as venue_address,
        v.city as venue_city,
        v.category as venue_type,
        v.google_rating as venue_rating,
        v.latitude,
        v.longitude,
        v.google_photos,
        (tf.quantity_available - tf.quantity_requested) as remaining
      FROM tonights_floor tf
      JOIN venues v ON tf.venue_id = v.id
      WHERE tf.is_active = 1
        AND tf.is_locked = 0
        AND tf.valid_date = date('now')
        AND (tf.expires_at IS NULL OR tf.expires_at > datetime('now'))
        AND (tf.quantity_available - tf.quantity_requested) > 0
        AND v.city LIKE ?
    `;

    const params: any[] = [`%${city}%`];

    if (type) {
      query += ` AND tf.type = ?`;
      params.push(type);
    }

    query += `
      ORDER BY 
        tf.is_flash_deal DESC,
        tf.released_at DESC
      LIMIT ?
    `;
    params.push(limit);

    const items = db.prepare(query).all(...params);

    // Format items
    const formattedItems = items.map((item: any) => {
      let photo = null;
      try {
        const photos = JSON.parse(item.google_photos || '[]');
        photo = photos[0] || null;
      } catch (e) {}

      return {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        original_price: item.original_price,
        current_price: item.current_price,
        min_spend: item.min_spend,
        capacity: item.capacity,
        remaining: item.remaining,
        section_name: item.section_name,
        bottle_type: item.bottle_type,
        is_flash_deal: item.is_flash_deal === 1,
        released_at: item.released_at,
        expires_at: item.expires_at,
        venue: {
          id: item.venue_id,
          name: item.venue_name,
          address: item.venue_address,
          city: item.venue_city,
          type: item.venue_type,
          rating: item.venue_rating,
          photo: photo,
          latitude: item.latitude,
          longitude: item.longitude,
        },
      };
    });

    db.close();

    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      city,
      count: formattedItems.length,
      items: formattedItems,
    });

  } catch (error) {
    console.error('Tonight\'s Floor error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
