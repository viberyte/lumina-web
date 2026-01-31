import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/lumina.db');
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getDb() {
  return open({ filename: DB_PATH, driver: sqlite3.Database });
}

// AI filter - is this good venue content or garbage?
async function isGoodContent(caption: string, mediaType: string): Promise<boolean> {
  if (!OPENAI_API_KEY) return true; // Skip AI if no key
  if (!caption || caption.length < 10) return true; // Allow posts with minimal/no caption
  
  const prompt = `You're filtering Instagram content for a nightlife venue app.

Caption: "${caption}"
Media Type: ${mediaType}

Is this GOOD content to show? (venue vibes, crowd, events, atmosphere, food/drinks, DJ, parties)
Or BAD content to hide? (memes, reposts, ads for other businesses, spam, off-topic, political)

Respond with only: GOOD or BAD`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim().toUpperCase();
    return content === 'GOOD';
  } catch (error) {
    console.error('AI filter error:', error);
    return true; // Default to showing if AI fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { venue_id, instagram_handle } = body;
    
    if (!venue_id || !instagram_handle) {
      return NextResponse.json({ error: 'venue_id and instagram_handle required' }, { status: 400 });
    }
    
    const cleanHandle = instagram_handle.replace('@', '').trim();
    
    // Start Apify scrape
    const apifyResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/${cleanHandle}/`],
          resultsType: 'posts',
          resultsLimit: 15,
        })
      }
    );
    
    if (!apifyResponse.ok) {
      const error = await apifyResponse.text();
      console.error('Apify start error:', error);
      return NextResponse.json({ error: 'Failed to start scrape' }, { status: 500 });
    }
    
    const runData = await apifyResponse.json();
    const runId = runData.data.id;
    
    // Poll for completion (max 60 seconds)
    let attempts = 0;
    let results: any[] = [];
    
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 2000));
      
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusRes.json();
      
      if (statusData.data.status === 'SUCCEEDED') {
        const datasetId = statusData.data.defaultDatasetId;
        const resultsRes = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
        );
        results = await resultsRes.json();
        break;
      } else if (statusData.data.status === 'FAILED') {
        return NextResponse.json({ error: 'Scrape failed' }, { status: 500 });
      }
      
      attempts++;
    }
    
    if (results.length === 0) {
      return NextResponse.json({ error: 'No posts found or timeout' }, { status: 404 });
    }
    
    const db = await getDb();
    const media: any[] = [];
    let filtered = 0;
    
    for (const post of results) {
      const caption = post.caption || '';
      const mediaType = post.type || (post.videoUrl ? 'video' : 'image');
      
      // AI filter
      const isGood = await isGoodContent(caption, mediaType);
      
      if (!isGood) {
        filtered++;
        continue;
      }
      
      const mediaUrl = post.videoUrl || post.displayUrl || post.imageUrl;
      const thumbnailUrl = post.displayUrl || post.imageUrl;
      
      if (!mediaUrl) continue;
      
      // Save to database
      await db.run(`
        INSERT INTO venue_instagram_media (
          venue_id, post_id, media_type, media_url, thumbnail_url,
          caption, likes, comments, posted_at, scraped_at, is_approved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)
        ON CONFLICT(post_id) DO UPDATE SET
          media_url = excluded.media_url,
          thumbnail_url = excluded.thumbnail_url,
          likes = excluded.likes,
          comments = excluded.comments,
          scraped_at = datetime('now')
      `, [
        venue_id,
        post.id || post.shortCode,
        mediaType,
        mediaUrl,
        thumbnailUrl,
        caption.substring(0, 500),
        post.likesCount || 0,
        post.commentsCount || 0,
        post.timestamp || new Date().toISOString()
      ]);
      
      media.push({
        post_id: post.id || post.shortCode,
        media_type: mediaType,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        likes: post.likesCount || 0
      });
    }
    
    // Update venue's last scraped timestamp
    await db.run(
      `UPDATE venues SET instagram_last_scraped = datetime('now') WHERE id = ?`,
      [venue_id]
    );
    
    await db.close();
    
    return NextResponse.json({
      success: true,
      posts_scraped: results.length,
      media_saved: media.length,
      filtered_out: filtered,
      media
    });
    
  } catch (error) {
    console.error('Venue Instagram scrape error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET - Fetch saved media for a venue
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venue_id');
    const mediaType = searchParams.get('type'); // 'video', 'image', or null for all
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!venueId) {
      return NextResponse.json({ error: 'venue_id required' }, { status: 400 });
    }
    
    const db = await getDb();
    
    let query = `
      SELECT * FROM venue_instagram_media 
      WHERE venue_id = ? AND is_approved = 1
    `;
    const params: any[] = [venueId];
    
    if (mediaType) {
      query += ` AND media_type = ?`;
      params.push(mediaType);
    }
    
    query += ` ORDER BY posted_at DESC LIMIT ?`;
    params.push(limit);
    
    const media = await db.all(query, params);
    
    await db.close();
    
    return NextResponse.json({ media });
    
  } catch (error) {
    console.error('Get venue media error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
