import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');
const cors = { 'Access-Control-Allow-Origin': '*' };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const VIBE_ADJ: Record<string, string> = {
  romantic:'romantic', intimate:'intimate', energetic:'high-energy', chill:'laid-back',
  trendy:'trendy', upscale:'upscale', cozy:'cozy', lively:'lively', fun:'fun',
  elegant:'elegant', sophisticated:'sophisticated', moody:'moody', buzzy:'buzzy',
  classic:'classic', hidden_gem:'hidden-gem', luxurious:'luxurious', artsy:'artsy',
};
const MUSIC_DESC: Record<string, string> = {
  jazz:'live jazz', hiphop:'hip-hop', rnb:'R&B', afrobeats:'Afrobeats', latin:'Latin music',
  reggaeton:'reggaeton', house:'house music', dj_sets:'DJ sets', live_band:'live band',
  acoustic:'acoustic sets', dancehall:'dancehall',
};
const FEAT_DESC: Record<string, string> = {
  rooftop:'rooftop setting', craft_cocktails:'craft cocktails', live_music:'live music',
  waterfront:'waterfront views', skyline_views:'skyline views', speakeasy:'speakeasy vibes',
  outdoor_seating:'outdoor seating', instagrammable:'Instagram-worthy plates',
  dance_floor:'a dance floor', late_kitchen:'a late-night kitchen', hookah:'hookah',
  bottle_service:'bottle service', private_dining:'private dining', tasting_menu:'a tasting menu',
  omakase:'omakase', wine_focused:'a wine-forward list',
};
const INTENT_WHY: Record<string, string> = {
  date_night:'Great for date night', group_dinner:'Perfect for group dinners',
  celebration:'Worth celebrating here', late_night_eats:'A late-night favorite',
  happy_hour:'Solid happy hour spot', business_dinner:'Easy to impress here',
  casual_hangout:'Low-key and reliable', solo_dining:'Comfortable solo',
  brunch:'Brunch destination', first_date:'First-date material',
  anniversary:'Anniversary-worthy', special_occasion:'Made for special occasions',
};

function buildWhy(vibes: string[], music: string[], features: string[], intents: string[]): string {
  const parts: string[] = [];
  
  // Lead with vibe + music/feature
  const topVibes = vibes.slice(0, 2).map(v => VIBE_ADJ[v]).filter(Boolean);
  const topMusic = music.filter(m => m !== 'no_music' && m !== 'background_music').slice(0, 1).map(m => MUSIC_DESC[m]).filter(Boolean);
  const topFeats = features.slice(0, 2).map(f => FEAT_DESC[f]).filter(Boolean);
  
  if (topVibes.length > 0 && topMusic.length > 0) {
    parts.push(`${topVibes.join(', ')} atmosphere with ${topMusic[0]}`);
  } else if (topVibes.length > 0 && topFeats.length > 0) {
    parts.push(`${topVibes.join(' and ')} spot with ${topFeats[0]}`);
  } else if (topVibes.length > 0) {
    parts.push(`${topVibes.join(', ')} atmosphere`);
  }
  
  // Add intent
  const topIntent = intents.slice(0, 1).map(i => INTENT_WHY[i]).filter(Boolean);
  if (topIntent.length > 0) {
    if (parts.length > 0) {
      parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      return `${parts[0]}. ${topIntent[0]}.`;
    }
    return `${topIntent[0]}.`;
  }
  
  if (parts.length > 0) {
    parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return parts[0] + '.';
  }
  return '';
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const db = new Database(DB_PATH, { readonly: true });
  const propSlug = new URL(request.url).searchParams.get('from');
  
  try {
    const v = db.prepare('SELECT * FROM venues WHERE id = ?').get(params.id) as any;
    if (!v) return NextResponse.json({ error: 'not found' }, { status: 404, headers: cors });

    // Property context
    let property = null;
    let walkMin = 0;
    let distMi = 0;
    if (propSlug) {
      const prop = db.prepare('SELECT name, latitude, longitude FROM hotel_partners WHERE slug = ?').get(propSlug) as any;
      if (prop) {
        const km = haversineKm(prop.latitude, prop.longitude, v.latitude, v.longitude);
        walkMin = Math.round(km / 0.08);
        distMi = Math.round(km * 0.621 * 10) / 10;
        property = { name: prop.name, walkMin, distMi };
      }
    }

    const attrs = db.prepare('SELECT attribute_type, attribute FROM venue_attributes WHERE venue_id = ? ORDER BY ai_confidence DESC').all(v.id) as any[];
    const byType: Record<string, string[]> = {};
    for (const a of attrs) {
      if (!byType[a.attribute_type]) byType[a.attribute_type] = [];
      if (!byType[a.attribute_type].includes(a.attribute)) byType[a.attribute_type].push(a.attribute);
    }

    let videoMap: Record<string, string[]> = {};
    try { videoMap = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'venue_video_map.json'), 'utf-8')); } catch {}
    const localVids = videoMap[String(v.id)] || [];

    const reelRows = db.prepare("SELECT video_url, reel_thumbnail_url, caption_excerpt FROM venue_discovery_evidence WHERE venue_id = ? AND source_platform = 'instagram' ORDER BY play_count DESC").all(v.id) as any[];
    const allReels = reelRows.map((r: any, i: number) => ({
      videoUrl: localVids[i] || '',
      thumbnailUrl: r.reel_thumbnail_url || '',
    }));

    const igEv = db.prepare("SELECT creator_username FROM venue_discovery_evidence WHERE venue_id = ? AND source_platform = 'instagram' LIMIT 1").get(v.id) as any;

    const vibes = byType.vibe || [];
    const music = byType.music || [];
    const features = byType.feature || [];
    const intents = byType.intent || [];
    
    const why = buildWhy(vibes, music, features, intents);
    
    // Pick 3 highlight chips from combined attributes
    const TAG_LABELS: Record<string, string> = {
      ...Object.fromEntries(vibes.map(v => [v, VIBE_ADJ[v] ? VIBE_ADJ[v].charAt(0).toUpperCase() + VIBE_ADJ[v].slice(1) : v])),
      ...Object.fromEntries(music.filter(m => m !== 'no_music' && m !== 'background_music').map(m => [m, MUSIC_DESC[m] ? MUSIC_DESC[m].charAt(0).toUpperCase() + MUSIC_DESC[m].slice(1) : m])),
      ...Object.fromEntries(intents.map(i => [i, INTENT_WHY[i] ? INTENT_WHY[i].split(' ').slice(0, 2).join(' ') : i])),
    };
    const chips = [
      ...(vibes.slice(0, 1).map(v => TAG_LABELS[v])),
      ...(music.filter(m => m !== 'no_music' && m !== 'background_music').slice(0, 1).map(m => TAG_LABELS[m])),
      ...(intents.slice(0, 1).map(i => TAG_LABELS[i])),
    ].filter(Boolean).slice(0, 3);

    return NextResponse.json({
      id: v.id, name: v.name, type: v.venue_type, cuisine: v.cuisine,
      image: v.image_url, price: v.price_range,
      phone: v.phone, website: v.website, address: v.address, neighborhood: v.neighborhood || '',
      property, why, chips,
      reel: allReels[0] || null, allReels,
      instagram: igEv?.creator_username || '',
      vibes, music, features, intents,
    }, { headers: cors });
  } finally { db.close(); }
}
