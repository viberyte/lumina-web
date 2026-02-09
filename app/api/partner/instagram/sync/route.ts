import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

export async function POST(request: NextRequest) {
  try {
    let token = request.headers.get('Authorization')?.replace('Bearer ', '');
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

    const ig = db.prepare(`
      SELECT access_token, instagram_user_id, instagram_username
      FROM partner_instagram 
      WHERE partner_id = ? AND token_expires_at > datetime('now')
    `).get(session.partner_id) as any;

    if (!ig) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 403 });
    }

    // Pull latest 50 posts
    const mediaRes = await fetch(
      `https://graph.instagram.com/v21.0/${ig.instagram_user_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count&limit=50&access_token=${ig.access_token}`
    );
    const mediaData = await mediaRes.json();

    if (!mediaData.data) {
      return NextResponse.json({ error: 'No media found' }, { status: 404 });
    }

    // Sort by engagement
    const posts = mediaData.data
      .map((p: any) => ({
        ...p,
        engagement: (p.like_count || 0) + (p.comments_count || 0),
      }))
      .sort((a: any, b: any) => b.engagement - a.engagement);

    // Top 10 images for gallery
    const galleryPhotos = posts
      .filter((p: any) => p.media_type === 'IMAGE' || p.media_type === 'CAROUSEL_ALBUM')
      .slice(0, 10)
      .map((p: any) => p.media_url);

    // Top reels
    const topReels = posts
      .filter((p: any) => p.media_type === 'VIDEO')
      .slice(0, 5)
      .map((p: any) => ({
        url: p.media_url,
        thumbnail: p.thumbnail_url,
        permalink: p.permalink,
        engagement: p.engagement,
        caption: p.caption?.substring(0, 100),
      }));

    // Update partner gallery
    if (galleryPhotos.length > 0) {
      db.prepare(`
        UPDATE partners SET 
          gallery_photos = ?,
          instagram_synced_at = datetime('now')
        WHERE id = ?
      `).run(JSON.stringify(galleryPhotos), session.partner_id);
    }

    // Update linked venue too
    const linkedVenue = db.prepare(`
      SELECT venue_id FROM partner_venues WHERE partner_id = ?
    `).get(session.partner_id) as any;

    if (linkedVenue?.venue_id && galleryPhotos.length > 0) {
      db.prepare(`
        UPDATE venues SET gallery_photos = ? WHERE id = ?
      `).run(JSON.stringify(galleryPhotos), linkedVenue.venue_id);
    }

    // Pull stories
    let stories: any[] = [];
    try {
      const storiesRes = await fetch(
        `https://graph.instagram.com/v21.0/${ig.instagram_user_id}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp&access_token=${ig.access_token}`
      );
      const storiesData = await storiesRes.json();
      stories = storiesData.data || [];
    } catch {}

    console.log(`✅ Synced Instagram for partner ${session.partner_id}: ${galleryPhotos.length} photos, ${topReels.length} reels, ${stories.length} stories`);

    return NextResponse.json({
      synced: true,
      photos_synced: galleryPhotos.length,
      reels_found: topReels.length,
      stories_found: stories.length,
      total_posts: posts.length,
      top_reels: topReels,
      top_post: posts[0] ? {
        permalink: posts[0].permalink,
        engagement: posts[0].engagement,
        caption: posts[0].caption?.substring(0, 100),
      } : null,
    });

  } catch (error: any) {
    console.error('Instagram sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
