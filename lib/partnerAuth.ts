import { NextRequest } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export function getTokenFromRequest(request: NextRequest): string | null {
  // Check cookie first
  let token = request.cookies.get('user_token')?.value;
  
  // Fall back to Authorization header (mobile)
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  
  return token || null;
}

export function getPartnerFromToken(token: string) {
  const db = new Database(DB_PATH);
  
  const user = db.prepare(`
    SELECT 
      u.id as user_id,
      u.email,
      u.name,
      u.partner_id,
      p.id as p_id,
      p.business_name,
      p.tier,
      p.status
    FROM user_sessions us
    JOIN users u ON u.id = us.user_id
    LEFT JOIN partners p ON u.partner_id = p.id
    WHERE us.token = ? AND us.expires_at > datetime('now')
  `).get(token) as any;
  
  db.close();
  return user;
}

export function getPartnerVenue(partnerId: number) {
  const db = new Database(DB_PATH);
  
  const venue = db.prepare(`
    SELECT 
      v.id,
      v.name,
      pv.venue_id
    FROM partner_venues pv
    LEFT JOIN venues v ON pv.venue_id = v.id
    WHERE pv.partner_id = ?
    ORDER BY pv.is_home DESC
    LIMIT 1
  `).get(partnerId) as any;
  
  db.close();
  return venue;
}
