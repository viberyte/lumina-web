export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';
const thumbnailDir = '/opt/viberyte/lumina-web/public/media/thumbnails';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ALLOWED_VOICES = ['neutral', 'young_male', 'young_female', 'mature_professional'];

// FIX 3: Varied fallback transitions
const FALLBACK_TRANSITIONS = [
  'Good energy shift from here.',
  'Easy move to keep the momentum.',
  'Nice contrast without killing the vibe.',
  'Smooth continuation nearby.',
  'Crowd usually overlaps well.',
  'Solid next move when ready.',
  'Natural flow from here.',
  'Different vibe, same energy.',
];

function getTimeContext(): { period: 'early' | 'prime' | 'late' | 'after_hours'; hour: number } {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 17 && hour < 21) return { period: 'early', hour };
  if (hour >= 21 && hour < 23) return { period: 'prime', hour };
  if (hour >= 23 || hour < 2) return { period: 'late', hour };
  if (hour >= 2 && hour < 5) return { period: 'after_hours', hour };
  
  return { period: 'early', hour };
}

function adaptInsightToTime(insight: string, period: string): string {
  if (period === 'early' || period === 'prime') return insight;
  
  if (period === 'late' || period === 'after_hours') {
    return insight
      .replace("Don't rush—it picks up after 11.", "It's going off right now.")
      .replace("Don't rush—it goes off after 11.", "It's going off right now.")
      .replace("Don't rush—it picks up after 11. Trust.", "It's popping right now. Trust.")
      .replace("The atmosphere develops after 11 PM.", "The atmosphere is at its peak.")
      .replace("DJ goes crazy later.", "DJ is going crazy right now.")
      .replace("DJ's actually good here.", "DJ is killing it right now.")
      .replace("Live DJ later in the evening.", "Live DJ performing now.")
      .replace("Dance floor gets packed after midnight.", "Dance floor is packed right now.")
      .replace("Dance floor is so fun after midnight.", "Dance floor is so fun right now.")
      .replace("Dance floor goes crazy after midnight.", "Dance floor is going crazy.")
      .replace("The dance floor becomes active later.", "The dance floor is quite active now.")
      .replace("Gets packed. Bring energy.", "Packed right now. Energy is up.")
      .replace("It gets packed—in the best way.", "It's packed right now—in the best way.")
      .replace("Expect high energy and a packed crowd.", "High energy and packed crowd right now.");
  }
  
  return insight;
}

function adaptTransitionToTime(message: string, period: string): string {
  if (period === 'late') {
    return message
      .replace("Solid next stop", "Perfect next move")
      .replace("Easy move to keep it going.", "Keep the momentum going.")
      .replace("Love this next spot.", "You have to hit this next.");
  }
  
  if (period === 'after_hours') {
    return message
      .replace("Solid next stop to keep the night going.", "Still going? This spot is open.")
      .replace("Easy move to keep it going.", "Still open. Let's keep it going.")
      .replace("A refined continuation of the evening.", "For those extending the evening.");
  }
  
  return message;
}

// FIX 4: Preserve good DB copy - only soften tone, don't replace meaning
function toneTransition(text: string, voice: string): string {
  if (voice === 'young_male') {
    return text
      // Only replace generic defaults
      .replace('Solid next stop to keep the night going.', 'Easy move to keep it going.')
      .replace('Good energy shift from here.', 'Energy shifts here.')
      .replace('Easy move to keep the momentum.', 'Keeps the momentum going.')
      .replace('Nice contrast without killing the vibe.', 'Different vibe, still solid.')
      .replace('Smooth continuation nearby.', 'Right around the corner.')
      .replace('Crowd usually overlaps well.', 'Same crowd vibes.')
      // Soften specific patterns
      .replace('Easy transition for drinks after dinner.', 'Smooth transition for drinks.')
      .replace('Natural progression when you want to dance.', 'This is where you go to dance.')
      .replace('Scenic spot with a different energy.', 'Views are solid here.')
      .replace('Just around the corner, similar vibe.', 'Right around the corner.')
      // Keep ride messages but adjust tone
      .replace(/(\d+) min ride to level up the night\./, '$1 min ride to level up.')
      .replace(/(\d+) min ride, worth the trip\./, '$1 min ride. Worth it.');
  }

  if (voice === 'young_female') {
    return text
      // Only replace generic defaults
      .replace('Solid next stop to keep the night going.', 'Love this next spot.')
      .replace('Good energy shift from here.', 'The energy is so good here.')
      .replace('Easy move to keep the momentum.', 'Perfect to keep it going.')
      .replace('Nice contrast without killing the vibe.', 'Different vibe but still cute.')
      .replace('Smooth continuation nearby.', 'Just around the corner!')
      .replace('Crowd usually overlaps well.', 'Same crowd, same energy.')
      // Soften specific patterns
      .replace('Easy transition for drinks after dinner.', 'Perfect for drinks after dinner.')
      .replace('Natural progression when you want to dance.', 'So fun if you want to dance.')
      .replace('Scenic spot with a different energy.', 'The views here are everything.')
      .replace('Just around the corner, similar vibe.', 'Just around the corner!')
      // Keep ride messages but adjust tone
      .replace(/(\d+) min ride to level up the night\./, '$1 min ride—so worth it.')
      .replace(/(\d+) min ride, worth the trip\./, '$1 min ride, trust me.');
  }

  if (voice === 'mature_professional') {
    return text
      // Only replace generic defaults
      .replace('Solid next stop to keep the night going.', 'A refined continuation of the evening.')
      .replace('Good energy shift from here.', 'A livelier atmosphere awaits.')
      .replace('Easy move to keep the momentum.', 'Seamless progression.')
      .replace('Nice contrast without killing the vibe.', 'Distinct atmosphere, consistent quality.')
      .replace('Smooth continuation nearby.', 'Conveniently located nearby.')
      .replace('Crowd usually overlaps well.', 'Similar clientele.')
      // Soften specific patterns
      .replace('Easy transition for drinks after dinner.', 'An ideal follow-up for post-dinner drinks.')
      .replace('Natural progression when you want to dance.', 'A suitable venue if dancing is desired.')
      .replace('Scenic spot with a different energy.', 'Notable views with a distinct atmosphere.')
      .replace('Just around the corner, similar vibe.', 'Conveniently located nearby.')
      // Keep ride messages but adjust tone
      .replace(/(\d+) min ride to level up the night\./, '$1 minute ride to an elevated experience.')
      .replace(/(\d+) min ride, worth the trip\./, '$1 minute ride, highly recommended.');
  }

  // Neutral voice - still add some variety
  return text
    .replace('Just around the corner, similar vibe.', 'Quick walk, same energy.')
    .replace('Easy walk, similar energy.', 'Easy walk nearby.')
    .replace('Nice walk to wind down.', 'Good walk to cool down.')
    .replace('Short walk to turn up the energy.', 'Short walk to turn up.');
}

// Helper to check if venue has images
function hasImage(stop: any): boolean {
  if (stop.google_photos && stop.google_photos !== '' && stop.google_photos !== '[]') return true;
  if (stop.gallery_photos && stop.gallery_photos !== '' && stop.gallery_photos !== '[]') return true;
  if (stop.image_url && stop.image_url !== '') return true;
  return false;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let db: any = null;
  
  try {
    db = new Database(dbPath, { readonly: true });
    const venueId = params.id;
    
    const searchParams = request.nextUrl.searchParams;
    const requestedVoice = searchParams.get('voice');
    const userId = Number(searchParams.get('user_id'));
    
    let voiceKey = 'neutral';
    
    if (requestedVoice && ALLOWED_VOICES.includes(requestedVoice)) {
      voiceKey = requestedVoice;
    } else if (Number.isInteger(userId) && userId > 0) {
      const profile = db.prepare(`SELECT voice_key FROM member_profiles WHERE user_id = ?`).get(userId);
      if (profile?.voice_key && ALLOWED_VOICES.includes(profile.voice_key)) {
        voiceKey = profile.voice_key;
      }
    }
    
    const useShortName = ['young_male', 'young_female'].includes(voiceKey);
    const timeContext = getTimeContext();

    const venue = db.prepare(`SELECT * FROM venues WHERE id = ?`).get(venueId);

    if (!venue) {
      db.close();
      return NextResponse.json({ error: 'Venue not found' }, { status: 404, headers: corsHeaders });
    }

    const instagramMedia = db.prepare(`
      SELECT id, media_type as type, media_url as url, thumbnail_url as thumbnail,
        caption, likes, comments, posted_at
      FROM venue_instagram_media 
      WHERE venue_id = ? AND is_approved = 1
      ORDER BY posted_at DESC LIMIT 20
    `).all(venueId);

    const tiktokVideos = db.prepare(`
      SELECT id, tiktok_id, video_path, cover_path, description,
        play_count, like_count, comment_count, share_count
      FROM venue_tiktok_videos 
      WHERE venue_id = ? AND is_verified = 1
      ORDER BY play_count DESC LIMIT 10
    `).all(venueId);

    // FIX 1 & 2: Remove photo filter, add duplicate_of filter
    let nextStops = db.prepare(`
      SELECT 
        v.id, v.name, v.short_name, v.category, v.primary_category, v.address, v.city,
        v.google_photos, v.gallery_photos, v.image_url,
        v.energy_level, v.google_price_level, v.rating, v.acoustic_band,
        vt.compatibility_score, vt.transition_type, vt.reason as transition_reason,
        vt.walk_time_minutes as travel_time, vt.transport_mode, vt.distance_meters
      FROM venue_transitions vt
      JOIN venues v ON v.id = vt.to_venue_id
      WHERE vt.from_venue_id = ?
        AND vt.acoustic_flow_valid = 1
        AND (v.duplicate_of IS NULL)
      ORDER BY vt.compatibility_score DESC
      LIMIT 10
    `).all(venueId);

    // FIX 2: Prefer venues with images, but keep good transitions
    if (nextStops.length > 0) {
      const withImages = nextStops.filter(hasImage);
      const withoutImages = nextStops.filter(s => !hasImage(s));
      nextStops = [...withImages, ...withoutImages].slice(0, 3);
    }

    // Fallback if no transitions
    if (nextStops.length === 0) {
      nextStops = db.prepare(`
        SELECT 
          id, name, short_name, category, primary_category, address, city,
          google_photos, gallery_photos, image_url,
          energy_level, google_price_level, rating, acoustic_band,
          NULL as compatibility_score, NULL as transition_type, NULL as transition_reason,
          NULL as travel_time, 'walk' as transport_mode, NULL as distance_meters
        FROM venues 
        WHERE id != ?
          AND city = (SELECT city FROM venues WHERE id = ?)
          AND (
            (google_photos IS NOT NULL AND google_photos != '' AND google_photos != '[]')
            OR (gallery_photos IS NOT NULL AND gallery_photos != '' AND gallery_photos != '[]')
            OR (image_url IS NOT NULL AND image_url != '')
          )
          AND (event_dependent = 0 OR event_dependent IS NULL)
          AND (duplicate_of IS NULL)
          AND category IN ('bar', 'lounge', 'rooftop', 'nightclub')
        ORDER BY RANDOM()
        LIMIT 3
      `).all(venueId, venueId);
    }

    const nextStopIds = nextStops.map((s: any) => s.id);
    let insightsByVenue: Record<number, any> = {};
    
    if (nextStopIds.length > 0) {
      for (const stopId of nextStopIds) {
        const insight = db.prepare(`
          SELECT insight_text, insight_type, voice_key
          FROM venue_insights
          WHERE venue_id = ?
            AND voice_key IN (?, 'neutral')
          ORDER BY
            CASE WHEN voice_key = ? THEN 0 ELSE 1 END,
            display_priority DESC
          LIMIT 1
        `).get(stopId, voiceKey, voiceKey);
        
        if (insight) insightsByVenue[stopId] = insight;
      }
    }

    const venueInsight = db.prepare(`
      SELECT insight_text, insight_type, voice_key
      FROM venue_insights
      WHERE venue_id = ?
        AND voice_key IN (?, 'neutral')
      ORDER BY
        CASE WHEN voice_key = ? THEN 0 ELSE 1 END,
        display_priority DESC
      LIMIT 1
    `).get(venueId, voiceKey, voiceKey);

    db.close();

    const jsonFields = [
      'google_photos', 'gallery_photos', 'vibe_tags', 'primary_vibes', 'secondary_vibes',
      'cuisine_types', 'cuisine_tags', 'music_genres', 'music_genres_normalized',
      'hours_json', 'menu_highlights', 'amenities', 'signature_items', 'crowd_type_tags'
    ];

    const parsedVenue: any = { ...venue };
    for (const field of jsonFields) {
      if (parsedVenue[field] && typeof parsedVenue[field] === 'string') {
        try { parsedVenue[field] = JSON.parse(parsedVenue[field]); } catch {}
      }
    }

    if (venueInsight) {
      parsedVenue.insight = adaptInsightToTime(venueInsight.insight_text, timeContext.period);
      parsedVenue.insight_voice = venueInsight.voice_key;
    }
    parsedVenue.voice_key = voiceKey;
    parsedVenue.time_period = timeContext.period;

    parsedVenue.instagram_media = instagramMedia.map((item: any) => {
      let thumbnail = item.url;
      if (item.type === 'video' && item.url) {
        const videoId = path.basename(item.url, '.mp4');
        const thumbPath = path.join(thumbnailDir, `${videoId}.jpg`);
        if (fs.existsSync(thumbPath)) thumbnail = `/media/thumbnails/${videoId}.jpg`;
      }
      return { id: item.id, type: item.type || 'image', url: item.url, thumbnail,
        caption: item.caption, likes: item.likes, comments: item.comments, posted_at: item.posted_at };
    });

    parsedVenue.tiktok_videos = tiktokVideos.map((item: any) => ({
      id: item.id, tiktok_id: item.tiktok_id, type: 'video',
      url: item.video_path, thumbnail: item.cover_path || item.video_path,
      description: item.description, play_count: item.play_count,
      like_count: item.like_count, comment_count: item.comment_count, share_count: item.share_count
    }));

    // Track which fallback index to use for variety
    let fallbackIndex = 0;

    // Track used messages to avoid repetition
    const usedMessages = new Set<string>();
    
    parsedVenue.next_stops = nextStops.map((stop: any) => {
      let imageUrl: string | null = null;
      
      for (const field of ['google_photos', 'gallery_photos']) {
        if (!imageUrl && stop[field] && stop[field] !== '' && stop[field] !== '[]') {
          try {
            const photos = typeof stop[field] === 'string' ? JSON.parse(stop[field]) : stop[field];
            if (Array.isArray(photos) && photos.length > 0) imageUrl = photos[0];
          } catch {}
        }
      }
      if (!imageUrl && stop.image_url) imageUrl = stop.image_url;

      // FIX 3: Use varied fallbacks instead of single default
      let transitionMessage = stop.transition_reason;
      if (!transitionMessage) {
        // Use rotating fallback messages
        transitionMessage = FALLBACK_TRANSITIONS[fallbackIndex % FALLBACK_TRANSITIONS.length];
        fallbackIndex++;
      }

      // Apply voice tone, then time adaptation
      transitionMessage = toneTransition(transitionMessage, voiceKey);
      transitionMessage = adaptTransitionToTime(transitionMessage, timeContext.period);
      
      // Dedupe: if this exact message was used, make it unique
      if (usedMessages.has(transitionMessage)) {
        const category = stop.category || stop.primary_category || '';
        const categoryLabel = {
          'bar': 'Great bar vibes.',
          'lounge': 'Lounge atmosphere.',
          'rooftop': 'Rooftop views.',
          'nightclub': 'Club energy.',
          'club': 'Club energy.',
          'restaurant': 'Good food too.',
          'cocktail_bar': 'Cocktails are solid.',
        }[category.toLowerCase()] || '';
        
        if (categoryLabel) {
          transitionMessage = categoryLabel;
        } else {
          // Rotate through alternatives
          const alts = ['Worth checking out.', 'Different vibe here.', 'Good option nearby.'];
          transitionMessage = alts[usedMessages.size % alts.length];
        }
      }
      usedMessages.add(transitionMessage);

      const matchedInsight = insightsByVenue[stop.id];
      let insightText = matchedInsight?.insight_text || null;
      if (insightText) {
        insightText = adaptInsightToTime(insightText, timeContext.period);
      }

      const travelTime = stop.travel_time || Math.floor(Math.random() * 9) + 4;
      const displayName = useShortName && stop.short_name ? stop.short_name : stop.name;

      return {
        id: stop.id,
        name: displayName,
        full_name: stop.name,
        category: stop.category || stop.primary_category,
        address: stop.address,
        image_url: imageUrl,
        energy_level: stop.energy_level,
        price_level: stop.google_price_level,
        rating: stop.rating,
        travel_time: travelTime,
        transport_mode: stop.transport_mode || 'walk',
        distance_meters: stop.distance_meters || null,
        compatibility_score: stop.compatibility_score || null,
        transition_type: stop.transition_type || null,
        transition_message: transitionMessage,
        venue_insight: insightText,
        insight_voice: matchedInsight?.voice_key || null,
      };
    });

    delete parsedVenue.professional_photos;
    return NextResponse.json(parsedVenue, { headers: corsHeaders });
  } catch (err) {
    console.error('[API /venues/[id]] Error:', err);
    if (db) db.close();
    return NextResponse.json({ error: 'Failed to fetch venue details' }, { status: 500, headers: corsHeaders });
  }
}
