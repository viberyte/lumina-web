import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

export async function GET(request: NextRequest) {
  const db = new Database(dbPath);
  
  try {
    let token = request.cookies.get('partner_token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get partner from session
    const session = db.prepare(`
      SELECT partner_id FROM partner_sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `).get(token) as any;

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get partner details
    const partner = db.prepare(`
      SELECT 
        id, email, name, business_name, bio, phone,
        profile_picture, instagram_handle, website,
        tier, status, primary_vibes, primary_genres,
        vibes, genres, gallery_photos, cover_photo_url,
        late_night_spot
      FROM partners WHERE id = ?
    `).get(session.partner_id) as any;

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Get linked venue if exists
    const venue = db.prepare(`
      SELECT v.id, v.name, v.primary_vibes, v.music_genres, v.bio,
             v.professional_photo_url, v.gallery_photos, v.late_night_spot
      FROM partner_venues pv
      JOIN venues v ON pv.venue_id = v.id
      WHERE pv.partner_id = ?
      LIMIT 1
    `).get(session.partner_id) as any;

    // Merge venue data if partner doesn't have their own
    const response = {
      id: partner.id,
      email: partner.email,
      name: partner.name,
      business_name: partner.business_name || venue?.name || '',
      bio: partner.bio || venue?.bio || '',
      phone: partner.phone || '',
      profile_picture: partner.profile_picture || '',
      cover_photo_url: partner.cover_photo_url || venue?.professional_photo_url || '',
      instagram_handle: partner.instagram_handle || '',
      website: partner.website || '',
      vibes: partner.vibes || partner.primary_vibes || venue?.primary_vibes || '[]',
      genres: partner.genres || partner.primary_genres || venue?.music_genres || '[]',
      gallery_photos: partner.gallery_photos || venue?.gallery_photos || '[]',
      late_night_spot: partner.late_night_spot || venue?.late_night_spot || false,
      tier: partner.tier || 'claimed',
      status: partner.status,
      linked_venue_id: venue?.id || null,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Partner profile GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function PUT(request: NextRequest) {
  const db = new Database(dbPath);
  
  try {
    let token = request.cookies.get('partner_token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = db.prepare(`
      SELECT partner_id FROM partner_sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `).get(token) as any;

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    
    // Update partner profile
    db.prepare(`
      UPDATE partners SET
        business_name = COALESCE(?, business_name),
        bio = COALESCE(?, bio),
        phone = COALESCE(?, phone),
        profile_picture = COALESCE(?, profile_picture),
        cover_photo_url = COALESCE(?, cover_photo_url),
        instagram_handle = COALESCE(?, instagram_handle),
        website = COALESCE(?, website),
        vibes = COALESCE(?, vibes),
        primary_vibes = COALESCE(?, primary_vibes),
        genres = COALESCE(?, genres),
        primary_genres = COALESCE(?, primary_genres),
        gallery_photos = COALESCE(?, gallery_photos),
        late_night_spot = COALESCE(?, late_night_spot),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      body.business_name,
      body.bio,
      body.phone,
      body.profile_picture,
      body.cover_photo_url,
      body.instagram_handle,
      body.website,
      body.vibes,
      body.primary_vibes,
      body.genres,
      body.primary_genres,
      body.gallery_photos,
      body.late_night_spot ? 1 : 0,
      session.partner_id
    );

    // Also update linked venue if exists
    const linkedVenue = db.prepare(`
      SELECT venue_id FROM partner_venues WHERE partner_id = ? AND venue_id IS NOT NULL
    `).get(session.partner_id) as any;

    if (linkedVenue?.venue_id) {
      db.prepare(`
        UPDATE venues SET
          bio = COALESCE(?, bio),
          primary_vibes = COALESCE(?, primary_vibes),
          music_genres = COALESCE(?, music_genres),
          late_night_spot = COALESCE(?, late_night_spot),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.bio,
        body.primary_vibes,
        body.genres,
        body.late_night_spot ? 1 : 0,
        linkedVenue.venue_id
      );
    }

    console.log(`✅ Partner ${session.partner_id} profile updated`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Partner profile PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}
