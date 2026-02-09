import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Instagram not connected or token expired' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'posts';

    let mediaData;

    if (type === 'stories') {
      const storiesRes = await fetch(
        `https://graph.instagram.com/v21.0/${ig.instagram_user_id}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp,caption&access_token=${ig.access_token}`
      );
      mediaData = await storiesRes.json();
    } else {
      const mediaRes = await fetch(
        `https://graph.instagram.com/v21.0/${ig.instagram_user_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count&limit=25&access_token=${ig.access_token}`
      );
      mediaData = await mediaRes.json();

      if (type === 'reels' && mediaData.data) {
        mediaData.data = mediaData.data.filter((m: any) => m.media_type === 'VIDEO');
      }
    }

    if (mediaData.error) {
      console.error('Instagram API error:', mediaData.error);
      return NextResponse.json({ error: 'Instagram API error', details: mediaData.error.message }, { status: 502 });
    }

    return NextResponse.json({
      username: ig.instagram_username,
      type,
      media: mediaData.data || [],
      paging: mediaData.paging || null,
    });

  } catch (error: any) {
    console.error('Instagram media error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
