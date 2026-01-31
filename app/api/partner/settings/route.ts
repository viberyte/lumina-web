import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Helper to get partner ID from token (supports both partner_token and user_token)
async function getPartnerId(): Promise<number | null> {
  const cookieStore = await cookies();
  
  // Try partner_token first (legacy)
  const partnerToken = cookieStore.get('partner_token')?.value;
  if (partnerToken) {
    const session = db.prepare(`
      SELECT partner_id FROM partner_sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `).get(partnerToken) as any;
    if (session?.partner_id) return session.partner_id;
  }
  
  // Try user_token (new unified auth)
  const userToken = cookieStore.get('user_token')?.value;
  if (userToken) {
    const user = db.prepare(`
      SELECT u.partner_id 
      FROM user_sessions us
      JOIN users u ON u.id = us.user_id
      WHERE us.token = ? AND us.expires_at > datetime('now')
    `).get(userToken) as any;
    if (user?.partner_id) return user.partner_id;
  }
  
  return null;
}

// GET - Load partner settings
export async function GET(request: NextRequest) {
  try {
    const partnerId = await getPartnerId();
    
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const partner = db.prepare(`
      SELECT 
        id, business_name, email, phone, bio, instagram_handle,
        venmo, zelle, cashapp, accept_cash, stripe_connected,
        tier, subscription_status
      FROM partners 
      WHERE id = ?
    `).get(partnerId) as any;

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        profile: {
          venueName: partner.business_name || '',
          description: partner.bio || '',
          phone: partner.phone || '',
          instagram: partner.instagram_handle || '',
        },
        payments: {
          venmo: partner.venmo || '',
          zelle: partner.zelle || '',
          cashapp: partner.cashapp || '',
          acceptCash: partner.accept_cash === 1,
          stripeConnected: partner.stripe_connected === 1,
        },
        subscription: {
          tier: partner.tier || 'claimed',
          status: partner.subscription_status || 'none',
        }
      }
    });

  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

// PUT - Update partner settings
export async function PUT(request: NextRequest) {
  try {
    const partnerId = await getPartnerId();
    
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { profile, payments } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (profile) {
      if (profile.venueName !== undefined) {
        updates.push('business_name = ?');
        values.push(profile.venueName?.trim().slice(0, 100));
      }
      if (profile.description !== undefined) {
        updates.push('bio = ?');
        values.push(profile.description?.trim().slice(0, 500));
      }
      if (profile.phone !== undefined) {
        updates.push('phone = ?');
        values.push(profile.phone?.replace(/\D/g, '').slice(0, 15));
      }
      if (profile.instagram !== undefined) {
        updates.push('instagram_handle = ?');
        values.push(profile.instagram?.replace('@', '').trim().slice(0, 50));
      }
    }

    if (payments) {
      if (payments.venmo !== undefined) {
        updates.push('venmo = ?');
        values.push(payments.venmo?.replace('@', '').trim().slice(0, 50));
      }
      if (payments.zelle !== undefined) {
        updates.push('zelle = ?');
        values.push(payments.zelle?.trim().slice(0, 100));
      }
      if (payments.cashapp !== undefined) {
        updates.push('cashapp = ?');
        values.push(payments.cashapp?.replace('$', '').trim().slice(0, 50));
      }
      if (payments.acceptCash !== undefined) {
        updates.push('accept_cash = ?');
        values.push(payments.acceptCash ? 1 : 0);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No settings to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(partnerId);

    const query = `UPDATE partners SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    });

  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
