import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

// GET - Get user's follows
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const followType = searchParams.get('type'); // 'venue', 'promoter', or null for all
    
    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    let follows;
    if (followType) {
      follows = db.prepare(`
        SELECT * FROM user_follows 
        WHERE user_id = ? AND follow_type = ?
        ORDER BY created_at DESC
      `).all(userId, followType);
    } else {
      follows = db.prepare(`
        SELECT * FROM user_follows 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(userId);
    }

    // Get details for each follow
    const venueIds = follows.filter((f: any) => f.follow_type === 'venue').map((f: any) => f.follow_id);
    const promoterIds = follows.filter((f: any) => f.follow_type === 'promoter').map((f: any) => f.follow_id);

    let venues: any[] = [];
    let promoters: any[] = [];

    if (venueIds.length > 0) {
      venues = db.prepare(`
        SELECT id, name, category, neighborhood, city, google_photos, professional_photo_url, image_url
        FROM venues WHERE id IN (${venueIds.map(() => '?').join(',')})
      `).all(...venueIds);
    }

    if (promoterIds.length > 0) {
      promoters = db.prepare(`
        SELECT id, instagram_handle, business_name, profile_picture, primary_genre, is_verified
        FROM promoters WHERE id IN (${promoterIds.map(() => '?').join(',')})
      `).all(...promoterIds);
    }

    db.close();

    return NextResponse.json({
      success: true,
      user_id: userId,
      counts: {
        total: follows.length,
        venues: venueIds.length,
        promoters: promoterIds.length,
      },
      follows: follows,
      venues: venues,
      promoters: promoters,
    });

  } catch (error) {
    console.error('Error fetching follows:', error);
    return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 });
  }
}

// POST - Follow a venue or promoter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, follow_type, follow_id } = body;
    
    if (!user_id || !follow_type || !follow_id) {
      return NextResponse.json({ error: 'user_id, follow_type, and follow_id required' }, { status: 400 });
    }

    if (!['venue', 'promoter'].includes(follow_type)) {
      return NextResponse.json({ error: 'follow_type must be venue or promoter' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    // Check if already following
    const existing = db.prepare(`
      SELECT id FROM user_follows 
      WHERE user_id = ? AND follow_type = ? AND follow_id = ?
    `).get(user_id, follow_type, follow_id);

    if (existing) {
      db.close();
      return NextResponse.json({ 
        success: true, 
        message: 'Already following',
        is_following: true 
      });
    }

    // Create follow
    db.prepare(`
      INSERT INTO user_follows (user_id, follow_type, follow_id)
      VALUES (?, ?, ?)
    `).run(user_id, follow_type, follow_id);

    db.close();

    return NextResponse.json({
      success: true,
      message: 'Followed successfully',
      is_following: true,
      user_id,
      follow_type,
      follow_id,
    });

  } catch (error) {
    console.error('Error creating follow:', error);
    return NextResponse.json({ error: 'Failed to follow' }, { status: 500 });
  }
}

// DELETE - Unfollow a venue or promoter
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const followType = searchParams.get('follow_type');
    const followId = searchParams.get('follow_id');
    
    if (!userId || !followType || !followId) {
      return NextResponse.json({ error: 'user_id, follow_type, and follow_id required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);

    db.prepare(`
      DELETE FROM user_follows 
      WHERE user_id = ? AND follow_type = ? AND follow_id = ?
    `).run(userId, followType, followId);

    db.close();

    return NextResponse.json({
      success: true,
      message: 'Unfollowed successfully',
      is_following: false,
    });

  } catch (error) {
    console.error('Error unfollowing:', error);
    return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 });
  }
}
