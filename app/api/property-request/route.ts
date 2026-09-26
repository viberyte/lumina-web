import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'lumina.db');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { propertyName, propertyType, address, city, state, contactName, contactEmail, contactPhone, contactTitle, numRooms, notes } = body;

    if (!propertyName || !contactName || !contactEmail) {
      return NextResponse.json({ error: 'Property name, contact name and email are required.' }, { status: 400 });
    }

    const db = new Database(DB_PATH);
    try {
      const stmt = db.prepare(
        'INSERT INTO property_requests (property_name, property_type, address, city, state, contact_name, contact_email, contact_phone, contact_title, num_rooms, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      stmt.run(propertyName, propertyType, address, city, state, contactName, contactEmail, contactPhone, contactTitle, numRooms, notes);
      return NextResponse.json({ success: true, message: 'Request received. We will be in touch within 48 hours.' });
    } finally {
      db.close();
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
