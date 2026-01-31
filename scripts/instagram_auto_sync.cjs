/**
 * Instagram Auto-Sync Engine
 * Scrapes Instagram posts from connected partners
 * Auto-creates events in Explore feed
 */

const Database = require('better-sqlite3');
const OpenAI = require('openai');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');
const openai = new OpenAI({
  apiKey: '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'
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzePostWithAI(caption, mediaUrl) {
  const prompt = `Analyze this Instagram post and determine if it's a nightlife event:

Caption: "${caption}"
Media URL: ${mediaUrl}

Extract:
1. Is this an event? (yes/no)
2. Event title
3. Event date (YYYY-MM-DD format, or null)
4. Event time (HH:MM format, or null)
5. Genre (hiphop/afrobeats/latin/edm/jazz/etc or null)
6. Description

Return ONLY JSON:
{
  "is_event": true/false,
  "title": "Event Name" or null,
  "event_date": "2026-01-20" or null,
  "event_time": "22:00" or null,
  "genre": "hiphop" or null,
  "description": "Brief description" or null
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('AI analysis error:', error.message);
    return null;
  }
}

async function getInstagramPosts(accessToken, userId) {
  try {
    const response = await fetch(
      `https://graph.instagram.com/${userId}/media?fields=id,caption,media_type,media_url,permalink,timestamp&limit=10&access_token=${accessToken}`
    );
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Instagram API error:', error.message);
    return [];
  }
}

async function syncPartnerInstagram(partner) {
  console.log(`\n[${partner.id}] ${partner.name} (@${partner.instagram_username})`);

  // Get access token
  const instagramData = db.prepare(`
    SELECT access_token, instagram_user_id 
    FROM partner_instagram 
    WHERE partner_id = ? AND token_expires_at > datetime('now')
  `).get(partner.id);

  if (!instagramData) {
    console.log('   ❌ No valid Instagram token');
    return { success: false, reason: 'no_token' };
  }

  // Get recent posts
  const posts = await getInstagramPosts(instagramData.access_token, instagramData.instagram_user_id);
  console.log(`   📸 Found ${posts.length} recent posts`);

  let newEvents = 0;
  let skipped = 0;

  for (const post of posts) {
    // Check if already processed
    const existing = db.prepare(`
      SELECT id FROM instagram_posts WHERE instagram_id = ?
    `).get(post.id);

    if (existing) {
      skipped++;
      continue;
    }

    // Analyze post with AI
    console.log(`   🤖 Analyzing post ${post.id}...`);
    const analysis = await analyzePostWithAI(post.caption || '', post.media_url);

    if (!analysis) {
      console.log('      ❌ AI analysis failed');
      continue;
    }

    // Save post to tracking table
    db.prepare(`
      INSERT INTO instagram_posts (
        partner_id, venue_id, instagram_id, media_url, caption, posted_at, event_created
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      partner.id,
      partner.venue_id || null,
      post.id,
      post.media_url || null,
      post.caption || null,
      post.timestamp,
      analysis.is_event ? 1 : 0
    );

    if (analysis.is_event && analysis.title) {
      console.log(`      ✨ Event detected: ${analysis.title}`);

      // Create event in partner_events
      const eventResult = db.prepare(`
        INSERT INTO partner_events (
          partner_id, venue_id, title, event_date, event_time, 
          genre, description, image_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')
      `).run(
        partner.id,
        partner.venue_id || null,
        analysis.title,
        analysis.event_date,
        analysis.event_time,
        analysis.genre,
        analysis.description,
        post.media_url
      );

      const eventId = eventResult.lastInsertRowid;

      // Update instagram_posts with event_id
      db.prepare(`
        UPDATE instagram_posts SET event_id = ? WHERE instagram_id = ?
      `).run(eventId, post.id);

      // SYNC TO MAIN EVENTS TABLE (for Explore page)
      if (partner.venue_id) {
        db.prepare(`
          INSERT INTO events (
            venue_id, name, date, time, genre, description, 
            image_url, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          partner.venue_id,
          analysis.title,
          analysis.event_date,
          analysis.event_time,
          analysis.genre,
          analysis.description,
          post.media_url
        );

        console.log(`      ✅ Synced to Explore feed`);
      }

      newEvents++;
    } else {
      console.log('      ⏭️  Not an event');
    }

    await sleep(500); // Rate limit
  }

  // Update last sync time
  db.prepare(`
    UPDATE partners SET last_instagram_sync = datetime('now') WHERE id = ?
  `).run(partner.id);

  console.log(`   📊 Created ${newEvents} events, skipped ${skipped}`);

  return { success: true, newEvents, skipped };
}

async function main() {
  console.log('🔄 Instagram Auto-Sync Engine');
  console.log(`   ${new Date().toISOString()}\n`);

  // Get all partners with Instagram connected
  const partners = db.prepare(`
    SELECT 
      p.id, p.name, p.instagram_username, p.tier,
      pv.id as venue_id, pv.name as venue_name
    FROM partners p
    LEFT JOIN partner_venues pv ON pv.partner_id = p.id AND pv.is_home = 1
    WHERE p.instagram_connected = 1
    ORDER BY p.last_instagram_sync ASC
  `).all();

  console.log(`📊 Found ${partners.length} partners with Instagram\n`);

  const stats = { processed: 0, newEvents: 0, errors: 0 };

  for (const partner of partners) {
    stats.processed++;
    
    const result = await syncPartnerInstagram(partner);
    
    if (result.success) {
      stats.newEvents += result.newEvents || 0;
    } else {
      stats.errors++;
    }

    await sleep(2000); // Rate limit between partners
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 SYNC COMPLETE');
  console.log('='.repeat(50));
  console.log(`   Partners: ${stats.processed}`);
  console.log(`   New Events: ${stats.newEvents}`);
  console.log(`   Errors: ${stats.errors}\n`);
}

main().catch(console.error);
