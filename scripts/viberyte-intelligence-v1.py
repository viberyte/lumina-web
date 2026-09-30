import json, sqlite3, os, time
from collections import defaultdict
from openai import OpenAI

client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])
db = sqlite3.connect('data/lumina.db')

# Google data by place_id
enriched = json.load(open('apify_enrichment_2.json'))
gdata = {d.get('placeId',''):{'rating':d.get('totalScore'),'reviews':d.get('reviewsCount'),'price':d.get('price','')} for d in enriched if d.get('placeId')}

# Load eligible venues
ELIGIBLE = ['restaurant','bar','club','lounge','cafe','coffee','grill','steakhouse','steak house',
    'bistro','pub','tavern','pizzeria','diner','barbecue','seafood','sushi','thai','korean',
    'italian','mexican','japanese','chinese','indian','french','mediterranean','african',
    'caribbean','cocktail','wine','american','fusion','hookah','brunch','night club','pizza',
    'jazz','live music','event venue','latin','new american','soul food','asian','greek',
    'turkish','ramen','cuban','cabaret','tapas']
REJECT = ['clothing','store','shop','media','business center','office','organization',
    'non-profit','gym','museum','observatory','real estate','jewelry','therapy','school',
    'church','parking','pharmacy','bank','salon','pottery','corporate','ice cream']

rows = db.execute('''
    SELECT cr.candidate_id, cr.google_name, cr.google_address, cr.google_category,
           cr.google_place_id, vc.discovery_queries, vc.unique_creators, vc.total_mentions
    FROM candidate_resolutions cr
    JOIN venue_candidates vc ON cr.candidate_id = vc.id
    WHERE cr.match_confidence = 'HIGH'
''').fetchall()

venues = []
for row in rows:
    (cid, g_name, g_addr, g_cat, g_pid, dq, creators, mentions) = row
    cat = (g_cat or '').lower()
    if any(r in cat for r in REJECT): continue
    if any(h in cat for h in ['hotel','lodging','motel']): continue
    if not any(v in cat for v in ELIGIBLE) and cat: continue
    dq_parsed = dq
    if isinstance(dq_parsed, str):
        try: dq_parsed = json.loads(dq_parsed)
        except: dq_parsed = {}
    gd = gdata.get(g_pid, {})
    ev_rows = db.execute('''SELECT caption_excerpt, search_query, play_count, creator_username
        FROM venue_discovery_evidence WHERE candidate_id = ? ORDER BY play_count DESC LIMIT 5''', (cid,)).fetchall()
    captions = [{'caption':r[0] or '','query':r[1] or '','plays':r[2] or 0,'creator':r[3] or ''} for r in ev_rows]
    venues.append({'cand_id':cid,'place_id':g_pid,'name':g_name,'address':g_addr,'category':g_cat,
        'rating':gd.get('rating'),'reviews':gd.get('reviews'),'price':gd.get('price',''),
        'discovery_queries':dq_parsed,'creators':creators,'mentions':mentions,
        'captions':captions,'evidence_count':len(ev_rows)})

print(f"Eligible venues: {len(venues)}")

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

PROMPT_TEMPLATE = """TAXONOMY — ONLY these values per category.
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

IMPORTANT: MODEL_KNOWLEDGE IS A VALID AND DESIRED INTELLIGENCE SOURCE.
If you confidently recognize a venue, you SHOULD use your existing knowledge to build a rich venue profile. Do not omit an attribute merely because it is not present in the supplied TikTok or Google evidence.

For venues you confidently recognize, use model knowledge generously for stable characteristics: general vibe, typical energy, music identity/style, signature features, typical audience, typical role in a night out, general occasion suitability.

Do NOT use model knowledge for volatile/current facts: current hours, tonight's event, current DJ, current menu, current prices, current promotion, temporary programming.

If you do NOT confidently recognize the venue, do not invent attributes.
model_knowledge is not a lower-quality answer. It is a provenance label.
Confidence below 0.5 = don't include. Return valid JSON.

Per venue: venue_index, known_venue
intents/vibes/music/features/time/flow_roles/best_for: [{{"name":"...","confidence":0.0-1.0,"source":"observed|verified|inferred|model_knowledge"}}]
energy: {{"level":"...","confidence":0.0-1.0,"source":"..."}}
insufficient_evidence: [], reasoning: ""

{venues_text}
Return: {{"venues": [...]}}"""

results = []
errors = 0
BATCH_SIZE = 4

for bs in range(0, len(venues), BATCH_SIZE):
    batch = venues[bs:bs+BATCH_SIZE]
    vtxt = ""
    for idx, vp in enumerate(batch):
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

    prompt = PROMPT_TEMPLATE.replace('{venues_text}', vtxt)
    
    try:
        resp = client.chat.completions.create(model="gpt-4o-mini",
            messages=[{"role":"system","content":"Viberyte venue evaluator. Return valid JSON. Rich profiles with honest provenance."},
                      {"role":"user","content":prompt}],
            response_format={"type":"json_object"}, temperature=0)
        parsed = json.loads(resp.choices[0].message.content)
        for vr in parsed.get('venues', []):
            vi = vr.get('venue_index',0) - 1
            if 0 <= vi < len(batch):
                vp = batch[vi]
                cleaned = {}
                violations = []
                for key in ['intents','vibes','music','features','time','flow_roles','best_for']:
                    clean = [a for a in vr.get(key,[]) if a.get('name','') in VALID[key]]
                    violations += [f"{key}:{a['name']}" for a in vr.get(key,[]) if a.get('name','') not in VALID[key]]
                    cleaned[key] = clean
                e = vr.get('energy',{})
                cleaned['energy'] = e if e.get('level','') in VALID['energy'] else {}
                cleaned['insufficient_evidence'] = vr.get('insufficient_evidence',[])
                cleaned['reasoning'] = vr.get('reasoning','')
                cleaned['known_venue'] = vr.get('known_venue', False)
                
                src = defaultdict(int)
                for k in ['intents','vibes','music','features','time','flow_roles','best_for']:
                    for a in cleaned[k]: src[a.get('source','unknown')] += 1
                e = cleaned.get('energy',{})
                if e.get('level') and e.get('source'): src[e['source']] += 1
                total = sum(src.values())
                obs = src.get('observed',0); ver = src.get('verified',0)
                inf = src.get('inferred',0); mod = src.get('model_knowledge',0)
                
                # Quality scoring
                prof = sum(len(cleaned[k]) for k in ['vibes','music','features','time','flow_roles','best_for'])
                prof_ev = sum(1 for k in ['vibes','music','features','time','flow_roles','best_for'] for a in cleaned[k] if a['source'] in ('observed','verified'))
                pq = 'EXCELLENT' if prof >= 6 and prof_ev >= 2 else 'GOOD' if prof >= 6 else 'GOOD' if prof >= 3 and prof_ev >= 1 else 'LIMITED' if prof >= 1 else 'INSUFFICIENT'
                
                disc = len(cleaned['intents'])
                disc_ev = sum(1 for a in cleaned['intents'] if a['source'] == 'observed')
                dqual = 'EXCELLENT' if disc >= 3 and disc_ev >= 2 else 'GOOD' if disc >= 2 and disc_ev >= 1 else 'LIMITED' if disc >= 1 else 'INSUFFICIENT'
                
                oq = 'EXCELLENT' if pq in ('EXCELLENT','GOOD') and dqual in ('EXCELLENT','GOOD') else 'GOOD' if pq != 'INSUFFICIENT' and dqual != 'INSUFFICIENT' else 'LIMITED' if pq != 'INSUFFICIENT' or dqual != 'INSUFFICIENT' else 'INSUFFICIENT'
                
                results.append({
                    'cand_id':vp['cand_id'],'place_id':vp['place_id'],
                    'name':vp['name'],'address':vp['address'],'category':vp['category'],
                    'rating':vp.get('rating'),'reviews':vp.get('reviews'),'price':vp.get('price',''),
                    'creators':vp['creators'],'mentions':vp['mentions'],'evidence_count':vp['evidence_count'],
                    'intelligence':cleaned,'violations':violations,'sources':dict(src),
                    'profile_quality':pq,'discovery_quality':dqual,'overall_quality':oq,
                })
        print(f"  Batch {bs//BATCH_SIZE+1}/{(len(venues)-1)//BATCH_SIZE+1}: {len(parsed.get('venues',[]))} done")
    except Exception as ex:
        print(f"  Batch {bs//BATCH_SIZE+1} ERROR: {ex}")
        errors += 1
    time.sleep(0.5)

# Save
with open('venue_intelligence_v31_staging.json', 'w') as f:
    json.dump(results, f, indent=2)

# Report
known = sum(1 for r in results if r['intelligence'].get('known_venue'))
pq_dist = defaultdict(int); dq_dist = defaultdict(int); oq_dist = defaultdict(int)
for r in results: pq_dist[r['profile_quality']] += 1; dq_dist[r['discovery_quality']] += 1; oq_dist[r['overall_quality']] += 1

total_src = defaultdict(int); total_attrs = 0
for r in results:
    for s,c in r['sources'].items(): total_src[s] += c; total_attrs += c
v_total = sum(len(r['violations']) for r in results)

print(f"\n{'='*60}")
print(f"V3.1 FULL EVALUATION — STAGING REPORT")
print(f"{'='*60}")
print(f"Input:          {len(venues)}")
print(f"Evaluated:      {len(results)}")
print(f"Errors:         {errors}")
print(f"GPT recognized: {known}/{len(results)}")
print(f"Violations:     {v_total}")
print(f"Avg attrs:      {total_attrs/len(results):.1f}")

print(f"\nProfile quality:")
for q in ['EXCELLENT','GOOD','LIMITED','INSUFFICIENT']: print(f"  {q}: {pq_dist.get(q,0)}")
print(f"\nDiscovery quality:")
for q in ['EXCELLENT','GOOD','LIMITED','INSUFFICIENT']: print(f"  {q}: {dq_dist.get(q,0)}")
print(f"\nOverall quality:")
for q in ['EXCELLENT','GOOD','LIMITED','INSUFFICIENT']: print(f"  {q}: {oq_dist.get(q,0)}")

print(f"\nSource breakdown ({total_attrs} total):")
for s,c in sorted(total_src.items(), key=lambda x:-x[1]):
    print(f"  {s}: {c} ({c*100//total_attrs}%)")

for label, key in [('INTENTS','intents'),('VIBES','vibes'),('FLOW ROLES','flow_roles'),('MUSIC','music'),('FEATURES','features')]:
    dist = defaultdict(int)
    for r in results:
        for a in r['intelligence'].get(key,[]):
            dist[a['name']] += 1
    print(f"\n{label}:")
    for k,v in sorted(dist.items(), key=lambda x:-x[1])[:12]:
        print(f"  {k}: {v}")

print(f"\nSaved to venue_intelligence_v31_staging.json")
db.close()
