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

function getTimeContext(tz: string) {
  const now = new Date();
  const h = parseInt(now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }));
  const day = now.toLocaleString('en-US', { timeZone: tz, weekday: 'long' });
  const ts = now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });
  if (h >= 5 && h < 11) return { period: 'morning', greeting: 'Good morning', timeAttrs: ['brunch','lunch'], bonusIntents: ['brunch','solo_dining','casual_hangout'], bonusRoles: ['standalone','dinner_anchor'], day, ts, h };
  if (h >= 11 && h < 15) return { period: 'afternoon', greeting: 'Good afternoon', timeAttrs: ['lunch','brunch','dinner'], bonusIntents: ['casual_hangout','business_dinner','brunch'], bonusRoles: ['standalone','dinner_anchor'], day, ts, h };
  if (h >= 15 && h < 18) return { period: 'pre-evening', greeting: 'Good evening', timeAttrs: ['happy_hour_time','dinner','pre_dinner'], bonusIntents: ['happy_hour','after_work','date_night'], bonusRoles: ['cocktail_stop','dinner_anchor','first_stop'], day, ts, h };
  if (h >= 18 && h < 22) return { period: 'evening', greeting: 'Tonight', timeAttrs: ['dinner','late_night'], bonusIntents: ['date_night','group_dinner','celebration','business_dinner'], bonusRoles: ['dinner_anchor','cocktail_stop','main_event'], day, ts, h };
  return { period: 'late', greeting: 'Tonight', timeAttrs: ['late_night','after_midnight'], bonusIntents: ['late_night_eats','celebration','casual_hangout'], bonusRoles: ['cocktail_stop','main_event','nightcap'], day, ts, h };
}

interface Attr { name: string; confidence: number; source: string; }

const LABELS: Record<string, Record<string, string>> = {
  intent: { date_night:'Great for date night', group_dinner:'Perfect for groups', celebration:'Celebration-worthy', birthday:'Birthday spot', late_night_eats:'Great for late-night eats', happy_hour:'Happy hour', business_dinner:'Business dinner', casual_hangout:'Casual hangout', solo_dining:'Solo-friendly', after_work:'After-work spot', brunch:'Brunch spot', girls_night:"Girls' night", guys_night:"Guys' night", special_occasion:'Special occasion', first_date:'First date', anniversary:'Anniversary', tourist_must_see:'Must-see', bachelor_bachelorette:'Bachelor/ette' },
  vibe: { romantic:'Romantic', intimate:'Intimate', energetic:'High energy', chill:'Chill vibes', trendy:'Trendy', upscale:'Upscale', cozy:'Cozy', lively:'Lively', fun:'Fun', elegant:'Elegant', sophisticated:'Sophisticated', buzzy:'Buzzy', moody:'Moody', classic:'Classic', hidden_gem:'Hidden gem', luxurious:'Luxurious', artsy:'Artsy', divey:'Dive-bar charm' },
  music: { hiphop:'Hip-Hop', rnb:'R&B', afrobeats:'Afrobeats', jazz:'Jazz', latin:'Latin', reggaeton:'Reggaeton', house:'House', dj_sets:'DJ Sets', live_band:'Live Band', dancehall:'Dancehall', amapiano:'Amapiano', acoustic:'Acoustic', techno:'Techno' },
  feature: { rooftop:'Rooftop', craft_cocktails:'Craft cocktails', live_music:'Live music', waterfront:'Waterfront', skyline_views:'Skyline views', speakeasy:'Speakeasy', bottle_service:'Bottle service', outdoor_seating:'Outdoor seating', instagrammable:'Instagram-worthy', private_dining:'Private dining', dance_floor:'Dance floor', late_kitchen:'Late kitchen', hookah:'Hookah', tasting_menu:'Tasting menu', omakase:'Omakase' },
};

function buildReasons(v: any, intentName?: string): string[] {
  const r: string[] = [];
  if (intentName) { const l = LABELS.intent[intentName]; if (l) r.push(l); }
  const topVibe = v.vibes[0]; if (topVibe) r.push(LABELS.vibe[topVibe.name] || topVibe.name);
  const topMusic = v.music.find((m: Attr) => m.name !== 'no_music' && m.name !== 'background_music');
  if (topMusic) r.push(LABELS.music[topMusic.name] || topMusic.name);
  const topFeat = v.features[0]; if (topFeat) r.push(LABELS.feature[topFeat.name] || topFeat.name);
  if (v.walkMin <= 10) r.push(`${v.walkMin} min walk`);
  else if (v.walkMin <= 20) r.push(`${v.walkMin} min away`);
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

    const rows = db.prepare("SELECT id, name, address, city, latitude, longitude, venue_type, cuisine, google_rating, google_review_count, image_url, price_range, phone, website FROM venues WHERE is_active=1 AND ingestion_status='approved'").all() as any[];
    const attrs = db.prepare('SELECT venue_id, attribute_type, attribute, ai_confidence, reasoning FROM venue_attributes').all() as any[];

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
      };
    });

    // Best Move
    const bestScored = venues.map(v => ({ v, s: score(v, { timeAttrs: time.timeAttrs, bonusIntents: time.bonusIntents, bonusRoles: time.bonusRoles }) })).sort((a, b) => b.s - a.s);
    const bm = bestScored[0]?.v;
    const bestMove = bm ? { id: bm.id, name: bm.name, type: bm.type, image: bm.image, rating: bm.rating, walkMinutes: bm.walkMin, reason: buildReasons(bm).join(' · ') } : null;

    // Flows
    function buildFlow(name: string, subtitle: string, stops: { role: string; flowRole: string; intent?: string; vibes?: string[]; time: string }[]) {
      const used: number[] = [];
      const result: any[] = [];
      for (const stop of stops) {
        const cands = venues.filter(v => !used.includes(v.id) && v.flowRoles.some((f: Attr) => f.name === stop.flowRole) && (!stop.intent || v.intents.some((i: Attr) => i.name === stop.intent)));
        const scored = cands.map(v => {
          const prevLat = result.length ? result[result.length - 1]._lat : pLat;
          const prevLng = result.length ? result[result.length - 1]._lng : pLng;
          const tKm = haversineKm(prevLat, prevLng, v.lat, v.lng);
          const tScore = tKm <= 0.8 ? 1 : tKm <= 1.5 ? 0.7 : tKm <= 3 ? 0.3 : 0;
          const vScore = score(v, { intent: stop.intent, timeAttrs: time.timeAttrs, flowRole: stop.flowRole, vibes: stop.vibes });
          return { v, combined: vScore * 0.6 + tScore * 0.4, tKm };
        }).sort((a, b) => b.combined - a.combined);
        if (scored.length === 0) continue;
        const best = scored[0];
        used.push(best.v.id);
        result.push({ time: stop.time, role: stop.role, _lat: best.v.lat, _lng: best.v.lng,
          venue: { id: best.v.id, name: best.v.name, type: best.v.type, image: best.v.image, rating: best.v.rating, transitionKm: Math.round(best.tKm * 100) / 100, walkFromPrevious: walkMin(best.tKm), reason: buildReasons(best.v, stop.intent).join(' · ') } });
      }
      if (result.length < 2) return null;
      return { name, subtitle, stops: result.map(({ _lat, _lng, ...r }) => r) };
    }

    const flows = [
      buildFlow('Date Night', 'Curated for two', [
        { role: 'Dinner', flowRole: 'dinner_anchor', intent: 'date_night', vibes: ['romantic','intimate','cozy'], time: '7:30 PM' },
        { role: 'Cocktails', flowRole: 'cocktail_stop', vibes: ['romantic','intimate','chill'], time: '9:45 PM' },
      ]),
      buildFlow('Friends Night', 'Dinner → Drinks → Out', [
        { role: 'Dinner', flowRole: 'dinner_anchor', intent: 'group_dinner', vibes: ['lively','fun','energetic'], time: '8:00 PM' },
        { role: 'Drinks', flowRole: 'cocktail_stop', vibes: ['energetic','lively'], time: '10:00 PM' },
        { role: 'Main Event', flowRole: 'main_event', vibes: ['energetic'], time: '11:30 PM' },
      ]),
      buildFlow('Late Night', 'The city after dark', [
        { role: 'Cocktails', flowRole: 'cocktail_stop', time: '10:30 PM' },
        { role: 'Main Event', flowRole: 'main_event', time: '12:00 AM' },
      ]),
    ].filter(Boolean);

    // Nearby
    const nearby = venues.filter(v => v.walkMin <= 15)
      .map(v => ({ id: v.id, name: v.name, type: v.type, image: v.image, walkMinutes: v.walkMin, rating: v.rating, reason: buildReasons(v).join(' · '), _s: score(v, { timeAttrs: time.timeAttrs }) }))
      .sort((a, b) => b._s - a._s).slice(0, 12).map(({ _s, ...v }) => v);

    // Occasions
    const occasions = [
      { intent: 'date_night', label: 'Date Night', subtitle: 'Curated for two', vibes: ['romantic','intimate','cozy'] },
      { intent: 'group_dinner', label: 'Group Dinner', subtitle: 'Bring the crew', vibes: ['lively','fun','energetic'] },
      { intent: 'celebration', label: 'Celebrations', subtitle: 'Make it special', vibes: ['upscale','elegant'] },
      { intent: 'business_dinner', label: 'Business Dinner', subtitle: 'Impress easily', vibes: ['upscale','sophisticated'] },
      { intent: 'late_night_eats', label: 'Late Night', subtitle: 'After midnight', vibes: [] },
      { intent: 'happy_hour', label: 'Happy Hour', subtitle: 'Wind down', vibes: ['chill','lively'] },
      { intent: 'casual_hangout', label: 'Casual', subtitle: 'Low-key vibes', vibes: ['chill','cozy'] },
    ].map(o => ({
      label: o.label, subtitle: o.subtitle, intent: o.intent,
      venues: venues.filter(v => v.intents.some((i: Attr) => i.name === o.intent))
        .filter(v => v.walkMin <= 45)
        .map(v => { let s = score(v, { intent: o.intent, timeAttrs: time.timeAttrs, vibes: o.vibes }); if (v.walkMin > 30) s -= 0.10; else if (v.walkMin > 20) s -= 0.04; return { id: v.id, name: v.name, type: v.type, cuisine: v.cuisine, image: v.image, rating: v.rating, walkMinutes: v.walkMin, reason: buildReasons(v, o.intent).join(' · '), _s: s }; })
        .sort((a, b) => b._s - a._s).slice(0, 8).map(({ _s, ...v }) => v),
    })).filter(o => o.venues.length > 0);

    // Intent filter
    let intentResults: any[] = [];
    if (intentFilter) {
      intentResults = venues.filter(v => v.intents.some((i: Attr) => i.name === intentFilter))
        .map(v => ({ id: v.id, name: v.name, type: v.type, cuisine: v.cuisine, image: v.image, rating: v.rating, walkMinutes: v.walkMin, reason: buildReasons(v, intentFilter).join(' · '), _s: score(v, { intent: intentFilter, timeAttrs: time.timeAttrs }) }))
        .sort((a, b) => b._s - a._s).slice(0, 12).map(({ _s, ...v }) => v);
    }

    return NextResponse.json({
      property: { name: prop.name, slug: prop.slug, neighborhood: prop.neighborhood || '', address: prop.address },
      time: { period: time.period, greeting: time.greeting, dayName: time.day, timeStr: time.ts },
      bestMove, flows, nearby, occasions, intentResults, total: venues.length,
    }, { headers: cors });
  } finally { db.close(); }
}

export async function OPTIONS() { return NextResponse.json({}, { headers: cors }); }
