import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export async function POST(request: NextRequest) {
  const db = new Database(dbPath);
  
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const partner = db.prepare(`
      SELECT id, email, password_hash, name, phone, business_name, instagram_handle
      FROM partners WHERE email = ?
    `).get(email) as any;

    if (!partner) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = verifyPassword(password, partner.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // === UNIFIED AUTH: Create or link user record ===
    let user = db.prepare(`SELECT id, roles FROM users WHERE email = ?`).get(email) as any;
    
    if (!user) {
      const result = db.prepare(`
        INSERT INTO users (email, name, partner_id, roles, created_at, updated_at)
        VALUES (?, ?, ?, '["consumer","partner"]', datetime('now'), datetime('now'))
      `).run(email, partner.name || partner.business_name, partner.id);
      
      user = { id: result.lastInsertRowid, roles: '["consumer","partner"]' };
      console.log(`Created user ${user.id} for partner ${partner.id}`);
    } else if (!user.roles?.includes('partner')) {
      db.prepare(`
        UPDATE users SET partner_id = ?, roles = '["consumer","partner"]', updated_at = datetime('now')
        WHERE id = ?
      `).run(partner.id, user.id);
      
      user.roles = '["consumer","partner"]';
      console.log(`Linked user ${user.id} to partner ${partner.id}`);
    }

    const venues = db.prepare(`
      SELECT id, name, address, is_home, subscription_status, trial_ends_at, stripe_connected
      FROM partner_venues WHERE partner_id = ?
      ORDER BY is_home DESC
    `).all(partner.id);

    // Create partner session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    db.prepare(`
      INSERT INTO partner_sessions (partner_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(partner.id, token, expiresAt.toISOString());

    // Create consumer session token (for unified auth)
    const consumerToken = crypto.randomBytes(32).toString('hex');
    
    db.prepare(`
      INSERT INTO user_sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(user.id, consumerToken, expiresAt.toISOString());

    const response = NextResponse.json({
      success: true,
      token,
      partner: { 
        id: partner.id, 
        email: partner.email, 
        name: partner.name, 
        phone: partner.phone,
        businessName: partner.business_name,
      },
      user: {
        id: user.id,
        email: email,
        roles: JSON.parse(user.roles || '["consumer","partner"]'),
        isPartner: true,
      },
      venues,
    });

    response.cookies.set('partner_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    response.cookies.set('user_token', consumerToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed: ' + error.message }, { status: 500 });
  } finally {
    db.close();
  }
}
