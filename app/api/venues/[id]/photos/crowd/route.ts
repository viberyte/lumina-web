import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sort') || 'likes'; // 'likes' | 'recent'
    
    if (isNaN(venueId)) {
      return NextResponse.json(
        { error: 'Invalid venue ID' },
        { status: 400 }
      );
    }

    const db = new Database(DB_PATH, { readonly: true });

    // Verify venue exists
    const venue = db.prepare(`
      SELECT id, name, instagram_location_id 
      FROM venues 
      WHERE id = ?
    `).get(venueId);

    if (!venue) {
      db.close();
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total 
      FROM crowd_photos 
      WHERE venue_id = ?
    `).get(venueId);

    // Get crowd photos with sorting
    const orderBy = sortBy === 'recent' 
      ? 'posted_at DESC' 
      : 'like_count DESC';

    const photos = db.prepare(`
      SELECT 
        id,
        instagram_post_id,
        image_url,
        posted_by_username,
        caption,
        like_count,
        comment_count,
        posted_at
      FROM crowd_photos 
      WHERE venue_id = ?
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(venueId, limit, offset);

    // Get engagement stats
    const stats = db.prepare(`
      SELECT 
        AVG(like_count) as avg_likes,
        MAX(like_count) as max_likes,
        AVG(comment_count) as avg_comments,
        COUNT(DISTINCT posted_by_username) as unique_posters,
        MIN(posted_at) as oldest_post,
        MAX(posted_at) as newest_post
      FROM crowd_photos 
      WHERE venue_id = ?
    `).get(venueId);

    db.close();

    return NextResponse.json({
      success: true,
      venue_id: venueId,
      venue_name: venue.name,
      instagram_location_id: venue.instagram_location_id,
      pagination: {
        total: countResult?.total || 0,
        limit: limit,
        offset: offset,
        has_more: offset + photos.length < (countResult?.total || 0)
      },
      stats: {
        avg_likes: Math.round(stats?.avg_likes || 0),
        max_likes: stats?.max_likes || 0,
        avg_comments: Math.round(stats?.avg_comments || 0),
        unique_posters: stats?.unique_posters || 0,
        date_range: {
          oldest: stats?.oldest_post,
          newest: stats?.newest_post
        }
      },
      photos: photos.map(p => ({
        id: p.id,
        instagram_post_id: p.instagram_post_id,
        image_url: p.image_url,
        username: p.posted_by_username,
        caption: p.caption,
        likes: p.like_count,
        comments: p.comment_count,
        posted_at: p.posted_at,
        instagram_url: `https://instagram.com/p/${p.instagram_post_id}`
      }))
    });

  } catch (error) {
    console.error('Error fetching crowd photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crowd photos' },
      { status: 500 }
    );
  }
}
