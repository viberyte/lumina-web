import json, sqlite3, os
from collections import defaultdict
from openai import OpenAI

client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])
db = sqlite3.connect('data/lumina.db')

enriched = json.load(open('apify_enrichment_2.json'))
gdata_by_pid = {d.get('placeId',''):{'rating':d.get('totalScore'),'reviews':d.get('reviewsCount'),'price':d.get('price','')} for d in enriched if d.get('placeId')}

old_results = json.load(open('test_20_results.json'))
old_by_name = {}
for r in old_results:
    old_src = defaultdict(int)
    for k in ['intents','vibes','music','features','time','flow_roles','best_for']:
        for a in r['intelligence'].get(k,[]): old_src[a.get('source','unknown')] += 1
    e = r['intelligence'].get('energy',{})
    if e.get('level') and e.get('source'): old_src[e['source']] += 1
    r['sources_recalc'] = dict(old_src)
    old_by_name[r['name'].lower()] = r

targets = ['marquee new york','house of yes','laissez faire','gitano nyc','quality meats']

rows = db.execute('''
    SELECT cr.candidate_id, cr.google_name, cr.google_address, cr.google_category,
           cr.google_place_id, vc.discovery_queries, vc.unique_creators, vc.total_mentions
    FROM candidate_resolutions cr
    JOIN venue_candidates vc ON cr.candidate_id = vc.id
    WHERE cr.match_confidence = 'HIGH'
''').fetchall()

test = []
for row in rows:
    (cid, g_name, g_addr, g_cat, g_pid, dq, creators, mentions) = row
    nl = g_name.lower()
    if not any(t in nl for t in targets): continue
    dq_parsed = dq
    if isinstance(dq_parsed, str):
        try: dq_parsed = json.loads(dq_parsed)
        except: dq_parsed = {}
    gd = gdata_by_pid.get(g_pid, {})
    ev_rows = db.execute('''SELECT caption_excerpt, search_query, play_count, creator_username
        FROM venue_discovery_evidence WHERE candidate_id = ? ORDER BY play_count DESC LIMIT 5''', (cid,)).fetchall()
    captions = [{'caption':r[0] or '','query':r[1] or '','plays':r[2] or 0,'creator':r[3] or ''} for r in ev_rows]
    test.append({'cand_id':cid,'name':g_name,'address':g_addr,'category':g_cat,'place_id':g_pid,
        'rating':gd.get('rating'),'reviews':gd.get('reviews'),'price':gd.get('price',''),
        'discovery_queries':dq_parsed,'creators':creators,'mentions':mentions,
        'captions':captions,'evidence_count':len(ev_rows)})

print(f"Regression venues: {len(test)}")

VALID = {
    'intents': {'date_night','group_dinner','solo_dining','business_dinner','celebration','birthday','bachelor_bachelorette','girls_night','guys_night','after_work','pre_game','late_night_eats','brunch','happy_hour','special_occasion','casual_hangout','first_date','anniversary','tourist_must_see'},
    'vibes': {'upscale','intimate','energetic','chill','trendy','classic','hidden_gem','luxurious','cozy','lively','sophisticated','artsy','divey','romantic','fun','buzzy','moody','elegant'},
    'music': {'hiphop','rnb','afrobeats','amapiano','latin','reggaeton','house','techno','jazz','live_band','dj_sets','acoustic','dancehall','no_music','background_music'},
    'features': {'bottle_service','rooftop','outdoor_seating','live_music','craft_cocktails','tasting_menu','omakase','hookah','wine_focused','speakeasy','velvet_rope','celebrity_sightings','instagrammable','waterfront','skyline_views','private_dining','dj','dance_floor','late_kitchen'},
    'time': {'lunch','brunch','dinner','late_night','after_midnight','all_day','weekend_only','weeknight','happy_hour_time','pre_dinner'},
    'flow_roles': {'first_stop','dinner_anchor','cocktail_stop','nightcap','after_dinner','main_event','pregame','wind_down','standalone'},
    'best_for': {'couples','friend_groups','solo','business','families','foodies','nightlife_crowd','cocktail_enthusiasts','music_lovers','special_occasion_seekers','tourists','locals'},
    'energy': {'low','medium_low','medium','medium_high','high','very_high'},
}

vtxt = ""
for idx, vp in enumerate(test):
    dq_str = ', '.join(f'"{k}" x{v}' for k,v in (vp['discovery_queries'] or {}).items())
    cap_txt = ""
    for ci, cap in enumerate(vp['captions'][:3], 1):
        cap_txt += f"\n    Caption {ci} (via \"{cap['query']}\", {cap['plays']:,} plays): \"{cap['caption'][:220]}\""
    vtxt += f"""
VENUE {idx+1}: {vp['name']}
  Address: {vp['address']} | Category: {vp['category']}
  Rating: {vp.get('rating','')}* ({vp.get('reviews','')} reviews) Price: {vp.get('price','') or '?'}
  TikTok: {dq_str or 'none'} | Creators: {vp['creators']} | Evidence: {vp['evidence_count']}
  Captions:{cap_txt if cap_txt else ' none'}
"""

prompt = f"""TAXONOMY — ONLY these values per category.
INTENTS: date_night, group_dinner, solo_dining, business_dinner, celebration, birthday, bachelor_bachelorette, girls_night, guys_night, after_work, pre_game, late_night_eats, brunch, happy_hour, special_occasion, casual_hangout, first_date, anniversary, tourist_must_see
VIBES: upscale, intimate, energetic, chill, trendy, classic, hidden_gem, luxurious, cozy, lively, sophisticated, artsy, divey, romantic, fun, buzzy, moody, elegant
MUSIC: hiphop, rnb, afrobeats, amapiano, latin, reggaeton, house, techno, jazz, live_band, dj_sets, acoustic, dancehall, no_music, background_music
FEATURES: bottle_service, rooftop, outdoor_seating, live_music, craft_cocktails, tasting_menu, omakase, hookah, wine_focused, speakeasy, velvet_rope, celebrity_sightings, instagrammable, waterfront, skyline_views, private_dining, dj, dance_floor, late_kitchen
TIME: lunch, brunch, dinner, late_night, after_midnight, all_day, weekend_only, weeknight, happy_hour_time, pre_dinner
FLOW_ROLES: first_stop, dinner_anchor, cocktail_stop, nightcap, after_dinner, main_event, pregame, wind_down, standalone
ENERGY: low, medium_low, medium, medium_high, high, very_high
BEST_FOR: couples, friend_groups, solo, business, families, foodies, nightlife_crowd, cocktail_enthusiasts, music_lovers, special_occasion_seekers, tourists, locals

Evaluate each venue. Label EVERY attribute with its source:

"observed" — ONLY when the supplied TikTok caption or search query directly states or clearly describes this attribute.

"verified" — ONLY when Google category or other structured factual data directly confirms it.

"inferred" — ONLY when the attribute is a logical derivation from OTHER attributes that are themselves observed or verified. The reasoning chain must start from observed/verified facts.

"model_knowledge" — When you recognize the venue and know this attribute from your training data, but the supplied evidence does not directly establish it AND it cannot be derived from observed/verified attributes.

CRITICAL: "inferred" is NOT "GPT thinks this is probably true." If you cannot trace the attribute back to supplied observed/verified evidence through a logical chain, it is model_knowledge.

IMPORTANT:

MODEL_KNOWLEDGE IS A VALID AND DESIRED INTELLIGENCE SOURCE.

If you confidently recognize a venue, you SHOULD use your existing knowledge to build a rich venue profile.

Do not omit an attribute merely because it is not present in the supplied TikTok or Google evidence.

Instead:
- Direct TikTok support → observed
- Structured factual support → verified
- Logical derivation from observed/verified facts → inferred
- Knowledge you possess about this specific venue that is not established by supplied evidence → model_knowledge

The goal is NOT to minimize model_knowledge.
The goal is to LABEL model_knowledge honestly.

For venues you confidently recognize, use model knowledge generously for relatively stable venue characteristics such as:
- general vibe
- typical energy
- music identity/style
- signature venue features
- typical audience/best_for
- typical role in a night out
- general occasion suitability

Do NOT use model knowledge for volatile/current facts such as:
- current hours, tonight's event, current DJ, current menu, current prices, current promotion, temporary programming

If you do NOT confidently recognize the venue, do not invent attributes.

model_knowledge is not a lower-quality answer that should be avoided. It is a provenance label.

Confidence below 0.5 = don't include. Return valid JSON.

Per venue: venue_index, known_venue
intents/vibes/music/features/time/flow_roles/best_for: [{{"name":"...","confidence":0.0-1.0,"source":"observed|verified|inferred|model_knowledge"}}]
energy: {{"level":"...","confidence":0.0-1.0,"source":"..."}}
insufficient_evidence: [], reasoning: ""

{vtxt}
Return: {{"venues": [...]}}"""

resp = client.chat.completions.create(model="gpt-4o-mini",
    messages=[{"role":"system","content":"Viberyte venue evaluator. Return valid JSON. Rich profiles with honest provenance. Use model_knowledge generously for recognized venues."},
              {"role":"user","content":prompt}],
    response_format={"type":"json_object"}, temperature=0)

parsed = json.loads(resp.choices[0].message.content)
results = []
for vr in parsed.get('venues', []):
    vi = vr.get('venue_index',0) - 1
    if 0 <= vi < len(test):
        vp = test[vi]
        cleaned = {}
        violations = []
        for key in ['intents','vibes','music','features','time','flow_roles','best_for']:
            clean = [a for a in vr.get(key,[]) if a.get('name','') in VALID[key]]
            violations += [f"{key}:{a['name']}" for a in vr.get(key,[]) if a.get('name','') not in VALID[key]]
            cleaned[key] = clean
        e = vr.get('energy',{})
        cleaned['energy'] = e if e.get('level','') in VALID['energy'] else {}
        cleaned['reasoning'] = vr.get('reasoning','')
        cleaned['known_venue'] = vr.get('known_venue', False)
        
        src = defaultdict(int)
        for k in ['intents','vibes','music','features','time','flow_roles','best_for']:
            for a in cleaned[k]: src[a.get('source','unknown')] += 1
        e = cleaned.get('energy',{})
        if e.get('level') and e.get('source'): src[e['source']] += 1
        
        results.append({'name':vp['name'],'intelligence':cleaned,'sources':dict(src),'violations':violations})

print(f"\n{'='*60}")
print(f"FINAL PROVENANCE REGRESSION")
print(f"{'='*60}\n")

for r in results:
    nl = r['name'].lower()
    old = old_by_name.get(nl, {})
    old_src = old.get('sources_recalc', {})
    new_src = r['sources']
    
    print(f"{r['name']}")
    print(f"  OLD: obs:{old_src.get('observed',0)} ver:{old_src.get('verified',0)} inf:{old_src.get('inferred',0)} mod:{old_src.get('model_knowledge',0)} total:{sum(old_src.values())}")
    print(f"  NEW: obs:{new_src.get('observed',0)} ver:{new_src.get('verified',0)} inf:{new_src.get('inferred',0)} mod:{new_src.get('model_knowledge',0)} total:{sum(new_src.values())}")
    
    intel = r['intelligence']
    for k in ['intents','vibes','music','features','time','flow_roles','best_for']:
        items = intel.get(k,[])
        if items:
            tagged = ', '.join(f"{a['name']}[{a['source'][:3]}]({a['confidence']:.0%})" for a in items)
            print(f"  {k}: {tagged}")
    e = intel.get('energy',{})
    if e.get('level'): print(f"  energy: {e['level']} [{e.get('source','?')[:3]}]({e.get('confidence',0):.0%})")
    if r['violations']: print(f"  VIOLATIONS: {r['violations']}")
    print()

old_t = defaultdict(int)
new_t = defaultdict(int)
for r in results:
    nl = r['name'].lower()
    old = old_by_name.get(nl, {})
    for s,c in old.get('sources_recalc',{}).items(): old_t[s] += c
    for s,c in r['sources'].items(): new_t[s] += c

print(f"TOTALS (5 venues):")
print(f"  V2 (old):  obs:{old_t.get('observed',0)} ver:{old_t.get('verified',0)} inf:{old_t.get('inferred',0)} mod:{old_t.get('model_knowledge',0)} total:{sum(old_t.values())}")
print(f"  V3.1 (new): obs:{new_t.get('observed',0)} ver:{new_t.get('verified',0)} inf:{new_t.get('inferred',0)} mod:{new_t.get('model_knowledge',0)} total:{sum(new_t.values())}")
print(f"\nViolations: {sum(len(r['violations']) for r in results)}")

db.close()
