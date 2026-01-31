import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

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
    const city = searchParams.get('city');
    const db = new Database(dbPath);

    if (city) {
      const rooms = db.prepare(`SELECT id, city, room_type, name, slug, emoji, description, parent_room_id, sort_order FROM chat_rooms WHERE city = ? AND is_active = 1 ORDER BY sort_order`).all(city);
      db.close();

      const isBorough = ['Manhattan', 'Brooklyn', 'Queens'].includes(city);
      const mainRoom = rooms.find(r => r.room_type === (isBorough ? 'borough' : 'city_main'));
      const vibeRooms = rooms.filter(r => r.room_type === 'vibe');

      return NextResponse.json({ city, is_borough: isBorough, main_room: mainRoom, vibe_rooms: vibeRooms, total: rooms.length }, { headers: corsHeaders });
    } else {
      const allRooms = db.prepare(`SELECT city, room_type, COUNT(*) as room_count FROM chat_rooms WHERE is_active = 1 GROUP BY city, room_type ORDER BY city`).all();
      db.close();

      const nycBoroughs = ['Manhattan', 'Brooklyn', 'Queens'];
      const regularCities = ['Philadelphia', 'North Jersey', 'South Jersey', 'Washington DC'];

      return NextResponse.json({
        nyc_boroughs: nycBoroughs.map(b => ({ name: b, room_count: (allRooms as any[]).filter(r => r.city === b).reduce((s, r) => s + r.room_count, 0) })),
        cities: regularCities.map(c => ({ name: c, room_count: (allRooms as any[]).filter(r => r.city === c).reduce((s, r) => s + r.room_count, 0) }))
      }, { headers: corsHeaders });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
