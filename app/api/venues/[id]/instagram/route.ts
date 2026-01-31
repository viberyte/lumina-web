import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db', { readonly: true });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = params.id;
    
    const venue = db.prepare(`
      SELECT id, name, instagram_handle, instagram_url
      FROM venues WHERE id = ?
    `).get(venueId) as any;
    
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }
    
    const posts = db.prepare(`
      SELECT 
        id,
        post_url,
        short_code,
        display_url,
        video_url,
        media_type,
        caption,
        likes_count,
        comments_count,
        posted_at
      FROM venue_instagram_posts
      WHERE venue_id = ?
      ORDER BY likes_count DESC
      LIMIT 30
    `).all(venueId);
    
    return NextResponse.json({
      venue: {
        id: venue.id,
        name: venue.name,
        instagram_handle: venue.instagram_handle,
        instagram_url: venue.instagram_url || `https://instagram.com/${venue.instagram_handle}`
      },
      posts,
      total: posts.length
    });
    
  } catch (error) {
    console.error('Instagram API error:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
