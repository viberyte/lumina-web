import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lumina.db');
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function walkMin(km: number): number { return Math.round(km / 0.08); }

interface Attr { name: string; confidence: number; source: string; }
interface ReelData { thumbnailUrl: string; postUrl: string; videoUrl: string; caption: string; plays: number; }

interface DaypartConfig {
  period: string; greeting: string; timeAttrs: string[];
  bonusIntents: string[]; bonusRoles: string[];
  moodChips: { key: string; label: string; icon: string }[];
  railConfig: { intent: string; title: string; subtitle: string }[];
  day: string; ts: string; h: number;
}

function getTimeContext(tz: string): DaypartConfig {
  const now = new Date();
  const h = parseInt(now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }));
  const day = now.toLocaleString('en-US', { timeZone: tz, weekday: 'long' });
  const ts = now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });

  if (h >= 5 && h < 11) return {
    period: 'morning', greeting: 'Good morning', timeAttrs: ['brunch','lunch'],
    bonusIntents: ['brunch','solo_dining','casual_hangout'], bonusRoles: ['standalone','dinner_anchor'],
    moodChips: [
      { key: 'brunch', label: 'Brunch', icon: '☕' },
      { key: 'casual_hangout', label: 'Chill', icon: '✌️' },
      { key: 'solo_dining', label: 'Solo', icon: '🎧' },
      { key: 'business_dinner', label: 'Meeting', icon: '💼' },
    ],
    railConfig: [
      { intent: 'brunch', title: 'Start Your Morning', subtitle: 'Brunch & coffee nearby' },
      { intent: 'casual_hangout', title: 'Casual Spots', subtitle: 'Low-key vibes' },
    ],
    day, ts, h,
  };
  if (h >= 11 && h < 15) return {
    period: 'afternoon', greeting: 'Good afternoon', timeAttrs: ['lunch','brunch','dinner'],
    bonusIntents: ['casual_hangout','business_dinner','brunch'], bonusRoles: ['standalone','dinner_anchor'],
    moodChips: [
      { key: 'casual_hangout', label: 'Lunch', icon: '🍽' },
      { key: 'business_dinner', label: 'Business', icon: '💼' },
      { key: 'happy_hour', label: 'Drinks', icon: '🍸' },
      { key: 'date_night', label: 'Tonight', icon: '✨' },
    ],
    railConfig: [
      { intent: 'casual_hangout', title: 'Lunch Nearby', subtitle: 'Quick and good' },
      { intent: 'business_dinner', title: 'Business Lunch', subtitle: 'Easy to impress' },
      { intent: 'date_night', title: 'Tonight Preview', subtitle: 'Plan ahead' },
    ],
    day, ts, h,
  };
  if (h >= 15 && h < 18) return {
    period: 'pre-evening', greeting: 'Good evening', timeAttrs: ['happy_hour_time','dinner','pre_dinner'],
    bonusIntents: ['happy_hour','after_work','date_night'], bonusRoles: ['cocktail_stop','dinner_anchor','first_stop'],
    moodChips: [
      { key: 'happy_hour', label: 'Cocktails', icon: '🍸' },
      { key: 'date_night', label: 'Date Night', icon: '❤️' },
      { key: 'group_dinner', label: 'Dinner', icon: '🍽' },
      { key: 'casual_hangout', label: 'Chill', icon: '✌️' },
    ],
    railConfig: [
      { intent: 'happy_hour', title: 'Happy Hour', subtitle: 'Wind down nearby' },
      { intent: 'date_night', title: 'Date Night', subtitle: 'Curated for two' },
      { intent: 'group_dinner', title: 'Dinner Plans', subtitle: 'Book the table' },
    ],
    day, ts, h,
  };
  if (h >= 18 && h < 22) return {
    period: 'evening', greeting: 'Tonight', timeAttrs: ['dinner','late_night'],
    bonusIntents: ['date_night','group_dinner','celebration','business_dinner'], bonusRoles: ['dinner_anchor','cocktail_stop','main_event'],
    moodChips: [
      { key: 'date_night', label: 'Date Night', icon: '❤️' },
      { key: 'group_dinner', label: 'Dinner', icon: '🍽' },
      { key: 'celebration', label: 'Celebrate', icon: '🥂' },
      { key: 'happy_hour', label: 'Cocktails', icon: '🍸' },
    ],
    railConfig: [
      { intent: 'date_night', title: 'Perfect for Tonight', subtitle: 'Curated for two' },
      { intent: 'group_dinner', title: 'Dinner That Impresses', subtitle: 'Worth booking' },
      { intent: 'celebration', title: 'Celebrations', subtitle: 'Make it special' },
      { intent: 'happy_hour', title: 'Cocktails Worth Leaving For', subtitle: 'Nearby gems' },
    ],
    day, ts, h,
  };
  return {
    period: 'late', greeting: 'Tonight', timeAttrs: ['late_night','after_midnight'],
    bonusIntents: ['late_night_eats','celebration','casual_hangout'], bonusRoles: ['cocktail_stop','main_event','nightcap'],
    moodChips: [
      { key: 'late_night_eats', label: 'Late Night', icon: '🌙' },
      { key: 'celebration', label: 'Going Out', icon: '🥂' },
      { key: 'happy_hour', label: 'Cocktails', icon: '🍸' },
      { key: 'casual_hangout', label: 'Chill', icon: '✌️' },
    ],
    railConfig: [
      { intent: 'late_night_eats', title: 'Open Late Near You', subtitle: 'Late-night favorites' },
      { intent: 'celebration', title: 'Still Going', subtitle: 'The night continues' },
      { intent: 'casual_hangout', title: 'Wind Down', subtitle: 'Easy vibes' },
    ],
    day, ts, h,
  };
}

const LABELS: Record<string, Record<string, string>> = {
  intent: { date_night:'Great for date night', group_dinner:'Perfect for groups', celebration:'Celebration-worthy', late_night_eats:'Great for late-night eats', happy_hour:'Happy hour spot', business_dinner:'Business dinner', casual_hangout:'Casual hangout', solo_dining:'Solo-friendly', after_work:'After-work spot', brunch:'Brunch spot', special_occasion:'Special occasion', first_date:'First date', anniversary:'Anniversary-worthy', tourist_must_see:'Must-see', birthday:'Birthday spot' },
  vibe: { romantic:'Romantic', intimate:'Intimate', energetic:'High energy', chill:'Chill vibes', trendy:'Trendy', upscale:'Upscale', cozy:'Cozy', lively:'Lively', fun:'Fun', elegant:'Elegant', sophisticated:'Sophisticated', buzzy:'Buzzy', moody:'Moody', classic:'Classic', hidden_gem:'Hidden gem', luxurious:'Luxurious' },
  music: { hiphop:'Hip-Hop', rnb:'R&B', afrobeats:'Afrobeats', jazz:'Jazz', latin:'Latin', reggaeton:'Reggaeton', house:'House', dj_sets:'DJ Sets', live_band:'Live Band', dancehall:'Dancehall', acoustic:'Acoustic' },
  feature: { rooftop:'Rooftop', craft_cocktails:'Craft cocktails', live_music:'Live music', waterfront:'Waterfront', skyline_views:'Skyline views', speakeasy:'Speakeasy', outdoor_seating:'Outdoor seating', instagrammable:'Instagram-worthy', dance_floor:'Dance floor', late_kitchen:'Late kitchen' },
};

function buildReasons(v: any, intentName?: string): string[] {
  const r: string[] = [];
  if (intentName && LABELS.intent[intentName]) r.push(LABELS.intent[intentName]);
  const tv = v.vibes[0]; if (tv) r.push(LABELS.vibe[tv.name] || tv.name);
  const tm = v.music.find((m: Attr) => m.name !== 'no_music' && m.name !== 'background_music');
  if (tm) r.push(LABELS.music[tm.name] || tm.name);
  const tf = v.features[0]; if (tf && LABELS.feature[tf.name]) r.push(LABELS.feature[tf.name]);
  if (v.rating >= 4.5) r.push(`${v.rating}★`);
  return [...new Set(r)].slice(0, 3);
}

function score(v: any, opts: { intent?: string; timeAttrs: string[]; flowRole?: string; vibes?: string[]; bonusIntents?: string[]; bonusRoles?: string[] }): number {
  let s = 0;
  if (opts.intent) { const m = v.intents.find((i: Attr) => i.name === opts.intent); if (m) s += 0.25 * m.confidence; }
  const tm = v.time.find((t: Attr) => opts.timeAttrs.includes(t.name)); if (tm) s += 0.15 * tm.confidence;
  if (opts.flowRole) { const fm = v.flowRoles.find((f: Attr) => f.name === opts.flowRole); if (fm) s += 0.10 * fm.confidence; }
  if (!opts.intent && opts.bonusIntents) { let bi = 0; for (const b of opts.bonusIntents) { const m = v.intents.find((i: Attr) => i.name === b); if (m && m.confidence > bi) bi = m.confidence; } s += 0.15 * bi; }
  if (!opts.flowRole && opts.bonusRoles) { let br = 0; for (const b of opts.bonusRoles) { const m = v.flowRoles.find((f: Attr) => f.name === b); if (m && m.confidence > br) br = m.confidence; } s += 0.05 * br; }
  if (opts.vibes) { const vm = v.vibes.filter((vi: Attr) => opts.vibes!.includes(vi.name)); if (vm.length) s += 0.10 * (vm.reduce((a: number, b: Attr) => a + b.confidence, 0) / vm.length); }
  else if (v.vibes.length) s += 0.05 * v.vibes[0].confidence;
  if (v.rating) s += 0.15 * Math.max(Math.min((v.rating - 3) / 2, 1), 0);
  s += 0.15 * Math.max(1 - v.distanceKm / 3.0, 0);
  const allA = [...v.intents, ...v.vibes, ...v.features, ...v.time, ...v.flowRoles];
  if (allA.length) s += 0.10 * (allA.reduce((a: number, b: Attr) => a + b.confidence, 0) / allA.length);
  return s;
}

function enrichVenue(v: any, intentName?: string) {
  return {
    id: v.id, name: v.name, type: v.type, cuisine: v.cuisine,
    image: v.image, walkMinutes: v.walkMin,
    neighborhood: v.neighborhood || '',
    reason: buildReasons(v, intentName).join(' · '),
    reel: v.reel,
  };
}

export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get('slug');
  const intentFilter = new URL(request.url).searchParams.get('intent');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400, headers: cors });

  const db = new Database(DB_PATH, { readonly: true });
  try {
    const prop = db.prepare('SELECT * FROM hotel_partners WHERE slug = ?').get(slug) as any;
    if (!prop) return NextResponse.json({ error: 'not found' }, { status: 404, headers: cors });

    const tz = prop.timezone || 'America/New_York';
    const time = getTimeContext(tz);
    const pLat = prop.latitude, pLng = prop.longitude;

    const rows = db.prepare("SELECT id, name, address, city, latitude, longitude, venue_type, cuisine, google_rating, google_review_count, image_url, price_range, phone, website, neighborhood FROM venues WHERE is_active=1 AND ingestion_status='approved'").all() as any[];
    const attrs = db.prepare('SELECT venue_id, attribute_type, attribute, ai_confidence, reasoning FROM venue_attributes').all() as any[];

    // Get best reel per venue
    const reelRows = db.prepare(`
      SELECT venue_id, video_url, reel_thumbnail_url, caption_excerpt, play_count
      FROM venue_discovery_evidence
      WHERE source_platform = 'instagram'
      ORDER BY play_count DESC
    `).all() as any[];
    
    let videoMap: Record<string, string[]> = {};
    try { const fs = require('fs'); videoMap = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'venue_video_map.json'), 'utf-8')); } catch {}

    const bestReel: Record<number, ReelData> = {};
    for (const r of reelRows) {
      if (!bestReel[r.venue_id]) {
        const localVids = videoMap[String(r.venue_id)] || [];
        bestReel[r.venue_id] = {
          thumbnailUrl: r.reel_thumbnail_url || '',
          postUrl: r.video_url || '',
          videoUrl: localVids[0] || '',
          caption: (r.caption_excerpt || '').slice(0, 100),
          plays: r.play_count || 0,
        };
      }
    }

    const attrMap: Record<number, any[]> = {};
    for (const a of attrs) { if (!attrMap[a.venue_id]) attrMap[a.venue_id] = []; attrMap[a.venue_id].push(a); }

    const venues = rows.map(v => {
      const d = haversineKm(pLat, pLng, v.latitude, v.longitude);
      const ma = attrMap[v.id] || [];
      const byT: Record<string, Attr[]> = {};
      for (const a of ma) { if (!byT[a.attribute_type]) byT[a.attribute_type] = []; byT[a.attribute_type].push({ name: a.attribute, confidence: a.ai_confidence, source: a.reasoning }); }
      return {
        id: v.id, name: v.name, address: v.address, type: v.venue_type, cuisine: v.cuisine,
        rating: v.google_rating, reviews: v.google_review_count, image: v.image_url,
        price: v.price_range, phone: v.phone, website: v.website,
        lat: v.latitude, lng: v.longitude, distanceKm: d, walkMin: walkMin(d),
        intents: byT.intent || [], vibes: byT.vibe || [], music: byT.music || [],
        features: byT.feature || [], time: byT.time || [], flowRoles: byT.flow_role || [],
        bestFor: byT.best_for || [], energy: (byT.energy || [])[0] || null,
        neighborhood: v.neighborhood || '', reel: bestReel[v.id] || null,
      };
    });

    // Best Move (Viberyte Pick)
    const bestScored = venues.map(v => ({ v, s: score(v, { timeAttrs: time.timeAttrs, bonusIntents: time.bonusIntents, bonusRoles: time.bonusRoles }) })).sort((a, b) => b.s - a.s);
    const bm = bestScored[0]?.v;
    const pick = bm ? enrichVenue(bm) : null;

    // Hero venue — best reel-equipped venue for this daypart
    const heroVenue = bestScored.find(x => x.v.reel?.thumbnailUrl)?.v;
    const hero = heroVenue ? enrichVenue(heroVenue) : pick;

    // Flows
    function buildFlow(name: string, subtitle: string, stops: { role: string; flowRole: string; intent?: string; vibes?: string[]; time: string }[]) {
      const used: number[] = [];
      const result: any[] = [];
      for (const stop of stops) {
        const cands = venues.filter(v => !used.includes(v.id) && v.flowRoles.some((f: Attr) => f.name === stop.flowRole) && (!stop.intent || v.intents.some((i: Attr) => i.name === stop.intent)));
        const scored = cands.map(v => {
          const prevLat = result.length ? result[result.length-1]._lat : pLat;
          const prevLng = result.length ? result[result.length-1]._lng : pLng;
          const tKm = haversineKm(prevLat, prevLng, v.lat, v.lng);
          const tScore = tKm <= 0.8 ? 1 : tKm <= 1.5 ? 0.7 : tKm <= 3 ? 0.3 : 0;
          const vScore = score(v, { intent: stop.intent, timeAttrs: time.timeAttrs, flowRole: stop.flowRole, vibes: stop.vibes });
          return { v, combined: vScore * 0.6 + tScore * 0.4, tKm };
        }).sort((a, b) => b.combined - a.combined);
        if (scored.length === 0) continue;
        const best = scored[0];
        used.push(best.v.id);
        result.push({ time: stop.time, role: stop.role, _lat: best.v.lat, _lng: best.v.lng,
          venue: { ...enrichVenue(best.v, stop.intent), walkFromPrevious: walkMin(best.tKm), transitionKm: Math.round(best.tKm * 100) / 100 } });
      }
      if (result.length < 2) return null;
      const images = result.map(r => r.venue.reel?.thumbnailUrl || r.venue.image).filter(Boolean).slice(0, 3);
      return { name, subtitle, stops: result.map(({ _lat, _lng, ...r }) => r), images, stopCount: result.length };
    }

    const flows = [
      buildFlow('Date Night', 'Dinner → Cocktails', [
        { role: 'Dinner', flowRole: 'dinner_anchor', intent: 'date_night', vibes: ['romantic','intimate','cozy'], time: '7:30 PM' },
        { role: 'Cocktails', flowRole: 'cocktail_stop', vibes: ['romantic','intimate','chill'], time: '9:45 PM' },
      ]),
      buildFlow('Friends Night', 'Dinner → Drinks → Out', [
        { role: 'Dinner', flowRole: 'dinner_anchor', intent: 'group_dinner', vibes: ['lively','fun','energetic'], time: '8:00 PM' },
        { role: 'Drinks', flowRole: 'cocktail_stop', vibes: ['energetic','lively'], time: '10:00 PM' },
        { role: 'Main Event', flowRole: 'main_event', vibes: ['energetic'], time: '11:30 PM' },
      ]),
      buildFlow('Late Night', 'Cocktails → After Dark', [
        { role: 'Cocktails', flowRole: 'cocktail_stop', time: '10:30 PM' },
        { role: 'Main Event', flowRole: 'main_event', time: '12:00 AM' },
      ]),
    ].filter(Boolean);

    // Dynamic rails from daypart config
    const rails = time.railConfig.map(rc => {
      const scored = venues
        .filter(v => v.intents.some((i: Attr) => i.name === rc.intent) && v.walkMin <= 45)
        .map(v => { let s = score(v, { intent: rc.intent, timeAttrs: time.timeAttrs }); if (v.walkMin > 30) s -= 0.10; else if (v.walkMin > 20) s -= 0.04; return { ...enrichVenue(v, rc.intent), _s: s }; })
        .sort((a, b) => b._s - a._s).slice(0, 8).map(({ _s, ...v }) => v);
      return { title: rc.title, subtitle: rc.subtitle, intent: rc.intent, venues: scored };
    }).filter(r => r.venues.length > 0);

    // Walk from hotel
    const nearby = venues.filter(v => v.walkMin <= 15)
      .map(v => ({ ...enrichVenue(v), _s: score(v, { timeAttrs: time.timeAttrs, bonusIntents: time.bonusIntents }) }))
      .sort((a, b) => b._s - a._s).slice(0, 10).map(({ _s, ...v }) => v);

    // Intent filter
    let intentResults: any[] = [];
    if (intentFilter) {
      intentResults = venues.filter(v => v.intents.some((i: Attr) => i.name === intentFilter) && v.walkMin <= 45)
        .map(v => { let s = score(v, { intent: intentFilter, timeAttrs: time.timeAttrs }); if (v.walkMin > 30) s -= 0.10; else if (v.walkMin > 20) s -= 0.04; return { ...enrichVenue(v, intentFilter), _s: s }; })
        .sort((a, b) => b._s - a._s).slice(0, 12).map(({ _s, ...v }) => v);
    }

    return NextResponse.json({
      property: { name: prop.name, slug: prop.slug, neighborhood: prop.neighborhood || '', address: prop.address },
      time: { period: time.period, greeting: time.greeting, dayName: time.day, timeStr: time.ts },
      moodChips: time.moodChips,
      hero, pick, flows, nearby, rails, intentResults, total: venues.length,
    }, { headers: cors });
  } finally { db.close(); }
}

export async function OPTIONS() { return NextResponse.json({}, { headers: cors }); }
