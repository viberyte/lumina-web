import json, sqlite3, shutil, os
from collections import defaultdict
from datetime import datetime

PREFLIGHT_ONLY = False

db = sqlite3.connect('data/lumina.db')
results = json.load(open('venue_intelligence_v31_staging_3.json'))
enriched = json.load(open('apify_enrichment_3.json'))
gdata = {d.get('placeId',''):d for d in enriched if d.get('placeId')}

promote = [r for r in results if r['overall_quality'] in ('EXCELLENT','GOOD')]

NYC_CITIES = {
    'New York','Brooklyn','Bronx','Queens','Staten Island',
    'Astoria','Long Island City','Flushing','Jamaica','Ridgewood',
    'Corona','Woodside','Forest Hills','Bayside','Richmond Hill',
    'Howard Beach','Queens Village','Rosedale','Harlem',
}
NJ_CITIES = {
    'Jersey City','Hoboken','Fort Lee','Edgewater','Montclair',
    'Weehawken Township','West New York','Clifton','Ridgewood','Totowa',
}

VALID_TAX = {
    'intent': {'date_night','group_dinner','solo_dining','business_dinner','celebration','birthday','bachelor_bachelorette','girls_night','guys_night','after_work','pre_game','late_night_eats','brunch','happy_hour','special_occasion','casual_hangout','first_date','anniversary','tourist_must_see'},
    'vibe': {'upscale','intimate','energetic','chill','trendy','classic','hidden_gem','luxurious','cozy','lively','sophisticated','artsy','divey','romantic','fun','buzzy','moody','elegant'},
    'music': {'hiphop','rnb','afrobeats','amapiano','latin','reggaeton','house','techno','jazz','live_band','dj_sets','acoustic','dancehall','no_music','background_music'},
    'feature': {'bottle_service','rooftop','outdoor_seating','live_music','craft_cocktails','tasting_menu','omakase','hookah','wine_focused','speakeasy','velvet_rope','celebrity_sightings','instagrammable','waterfront','skyline_views','private_dining','dj','dance_floor','late_kitchen'},
    'time': {'lunch','brunch','dinner','late_night','after_midnight','all_day','weekend_only','weeknight','happy_hour_time','pre_dinner'},
    'flow_role': {'first_stop','dinner_anchor','cocktail_stop','nightcap','after_dinner','main_event','pregame','wind_down','standalone'},
    'best_for': {'couples','friend_groups','solo','business','families','foodies','nightlife_crowd','cocktail_enthusiasts','music_lovers','special_occasion_seekers','tourists','locals'},
    'energy': {'low','medium_low','medium','medium_high','high','very_high'},
}
VALID_PROV = {'observed','verified','inferred','model_knowledge'}
type_map = {'intents':'intent','vibes':'vibe','music':'music','features':'feature',
            'time':'time','flow_roles':'flow_role','best_for':'best_for'}

# PHASE 1: ELIGIBILITY
eligible = []
nyc_count = 0
nj_count = 0
excluded_geo = []

for r in promote:
    g = gdata.get(r['place_id'], {})
    city = g.get('city','')
    state = g.get('state','')
    country = g.get('countryCode','')
    lat = g.get('location',{}).get('lat')
    
    if not city or not state or not lat:
        excluded_geo.append(f"missing_geo: {r['name']}")
        continue
    if country and country not in ('US',''):
        excluded_geo.append(f"non_US: {r['name']} ({country})")
        continue
    
    if state in ('New York','NY') and city in NYC_CITIES:
        eligible.append(r)
        nyc_count += 1
    elif state in ('New Jersey','NJ') and city in NJ_CITIES:
        eligible.append(r)
        nj_count += 1
    else:
        excluded_geo.append(f"{r['name']} — {city}, {state}")

# PHASE 2: PRE-FLIGHT AUDIT
malformed_attrs = []
invalid_prov_attrs = []
invalid_tax_attrs = []

for r in eligible:
    intel = r.get('intelligence', {})
    if not isinstance(intel, dict):
        malformed_attrs.append(f"{r['name']}: intelligence is {type(intel).__name__}")
        continue
    for field in ['intents','vibes','music','features','time','flow_roles','best_for']:
        atype = type_map[field]
        items = intel.get(field)
        if items is None: continue
        if not isinstance(items, list):
            malformed_attrs.append(f"{r['name']}: {field} is {type(items).__name__}: {str(items)[:60]}")
            continue
        for a in items:
            if not isinstance(a, dict):
                malformed_attrs.append(f"{r['name']}: {field} item is {type(a).__name__}: {str(a)[:60]}")
                continue
            aname = a.get('name','')
            src = a.get('source','')
            if src not in VALID_PROV:
                invalid_prov_attrs.append(f"{r['name']} [{r['place_id'][:12]}]: {atype}:{aname} source=\"{src}\"")
            if aname not in VALID_TAX.get(atype, set()):
                invalid_tax_attrs.append(f"{r['name']} [{r['place_id'][:12]}]: {atype}:{aname}")
    e = intel.get('energy', {})
    if e is not None and not isinstance(e, dict):
        malformed_attrs.append(f"{r['name']}: energy is {type(e).__name__}")
    elif isinstance(e, dict) and e.get('source','') and e['source'] not in VALID_PROV:
        invalid_prov_attrs.append(f"{r['name']}: energy:{e.get('level','')} source=\"{e['source']}\"")

print(f"{'='*50}")
print(f"PRE-FLIGHT REPORT")
print(f"{'='*50}")
print(f"  GOOD/EXCELLENT total:   {len(promote)}")
print(f"  Eligible:               {len(eligible)}")
print(f"    NYC:                  {nyc_count}")
print(f"    NJ:                   {nj_count}")
print(f"  Excluded geography:     {len(excluded_geo)}")
print(f"  Malformed intelligence: {len(malformed_attrs)}")
print(f"  Invalid provenance:     {len(invalid_prov_attrs)}")
print(f"  Invalid taxonomy:       {len(invalid_tax_attrs)}")

if invalid_tax_attrs:
    print(f"\n  Invalid taxonomy (first 30):")
    for t in invalid_tax_attrs[:30]: print(f"    {t}")
if malformed_attrs:
    print(f"\n  Malformed (first 30):")
    for m in malformed_attrs[:30]: print(f"    {m}")
if invalid_prov_attrs:
    print(f"\n  Invalid provenance (first 30):")
    for p in invalid_prov_attrs[:30]: print(f"    {p}")

# GATES
if malformed_attrs:
    print(f"\n❌ STOPPED — {len(malformed_attrs)} malformed intelligence records.")
    db.close(); exit(1)
if invalid_prov_attrs:
    print(f"\n❌ STOPPED — {len(invalid_prov_attrs)} invalid provenance records.")
    db.close(); exit(1)

print(f"\n  ✓ Pre-flight passed. Taxonomy violations ({len(invalid_tax_attrs)}) will be stripped and logged.")

if PREFLIGHT_ONLY:
    est_attrs = 0
    for r in eligible:
        intel = r.get('intelligence', {})
        if not isinstance(intel, dict): continue
        for field in ['intents','vibes','music','features','time','flow_roles','best_for']:
            atype = type_map[field]
            for a in intel.get(field, []):
                if not isinstance(a, dict): continue
                if a.get('name','') in VALID_TAX.get(atype, set()) and a.get('source','') in VALID_PROV:
                    est_attrs += 1
        e = intel.get('energy', {})
        if isinstance(e, dict) and e.get('level') in VALID_TAX['energy'] and e.get('source','') in VALID_PROV:
            est_attrs += 1

    eligible_cities_ny = defaultdict(int)
    eligible_cities_nj = defaultdict(int)
    for r in eligible:
        g = gdata.get(r['place_id'], {})
        city = g.get('city','')
        state = g.get('state','')
        if state in ('New York','NY'): eligible_cities_ny[city] += 1
        elif state in ('New Jersey','NJ'): eligible_cities_nj[city] += 1

    excluded_cities = defaultdict(int)
    for e in excluded_geo:
        parts = e.split(' — ')
        if len(parts) == 2: excluded_cities[parts[1]] += 1
        else: excluded_cities[e] += 1

    print(f"\n{'='*50}")
    print(f"PREFLIGHT SUMMARY")
    print(f"{'='*50}")
    print(f"  GOOD/EXCELLENT total:      {len(promote)}")
    print(f"  Eligible total:            {len(eligible)}")
    print(f"    NYC eligible:            {nyc_count}")
    print(f"    NJ eligible:             {nj_count}")
    print(f"  Excluded geography:        {len(excluded_geo)}")
    print(f"  Malformed intelligence:    {len(malformed_attrs)}")
    print(f"  Invalid provenance:        {len(invalid_prov_attrs)}")
    print(f"  Invalid taxonomy:          {len(invalid_tax_attrs)}")
    print(f"  Est. valid attributes:     {est_attrs}")
    print(f"\n  Eligible NYC cities:")
    for c, n in sorted(eligible_cities_ny.items(), key=lambda x:-x[1]):
        print(f"    {c}: {n}")
    print(f"\n  Eligible NJ cities:")
    for c, n in sorted(eligible_cities_nj.items(), key=lambda x:-x[1]):
        print(f"    {c}: {n}")
    print(f"\n  Excluded ({len(excluded_geo)}):")
    for c, n in sorted(excluded_cities.items(), key=lambda x:-x[1]):
        print(f"    {c}: {n}")
    print(f"\n✅ PREFLIGHT ONLY — no database changes")
    db.close()
    exit(0)

# PHASE 4: BACKUP
ts = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_pre = f'/opt/viberyte/backups/lumina_pre_scrape3_promotion_{ts}.db'
shutil.copy('data/lumina.db', backup_pre)
print(f"\n✅ Pre-backup: {backup_pre}")

# PHASE 5: ATOMIC PROMOTION
committed = False
try:
    db.execute("BEGIN IMMEDIATE")
    venues_inserted = 0
    attrs_inserted = 0
    attrs_skipped_tax = 0
    venue_errors = []
    attr_errors = []
    inserted_pids = []
    tax_log = []

    for r in eligible:
        g = gdata.get(r['place_id'], {})
        lat = g.get('location',{}).get('lat')
        lng = g.get('location',{}).get('lng')
        cat = (r.get('category','') or '').lower()
        city = g.get('city','')
        state = g.get('state','')
        region = 'nj' if state in ('New Jersey','NJ') else 'nyc'
        
        if 'night club' in cat: vtype = 'nightclub'
        elif 'jazz' in cat: vtype = 'jazz_club'
        elif 'cocktail' in cat: vtype = 'cocktail_bar'
        elif 'lounge' in cat: vtype = 'lounge'
        elif 'bar' in cat and 'barbecue' not in cat: vtype = 'bar'
        elif 'cafe' in cat or 'coffee' in cat: vtype = 'cafe'
        elif 'steak' in cat: vtype = 'steakhouse'
        elif 'restaurant' in cat: vtype = 'restaurant'
        else: vtype = 'restaurant'
        
        cuisine = ''
        for c, cu in [('korean','korean'),('italian','italian'),('mexican','mexican'),('japanese','japanese'),
                      ('sushi','japanese'),('thai','thai'),('chinese','chinese'),('french','french'),
                      ('mediterranean','mediterranean'),('caribbean','caribbean'),('american','american'),
                      ('african','african'),('indian','indian'),('peruvian','peruvian'),
                      ('colombian','colombian'),('dominican','dominican'),('jamaican','jamaican'),
                      ('haitian','haitian'),('turkish','turkish'),('ethiopian','ethiopian'),
                      ('brazilian','brazilian'),('portuguese','portuguese'),('cuban','cuban'),
                      ('vietnamese','vietnamese'),('seafood','seafood'),('soul food','soul_food'),
                      ('latin','latin'),('asian','asian'),('greek','mediterranean')]:
            if c in cat: cuisine = cu; break
        
        try:
            db.execute('''INSERT INTO venues (name, address, city, state, latitude, longitude, phone, website,
                 category, google_place_id, google_rating, google_review_count, image_url, price_range,
                 region, venue_type, cuisine, is_active, is_certified, ingestion_status,
                 intelligence_version, bougie_level)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?,?,3)''',
                (r['name'], r.get('address',''), city, state, lat, lng,
                 g.get('phone',''), g.get('website',''), r.get('category',''),
                 r['place_id'], r.get('rating'), r.get('reviews'), g.get('imageUrl',''),
                 r.get('price',''), region, vtype, cuisine, 'approved', 'v3.1-s3'))
            venues_inserted += 1
            inserted_pids.append(r['place_id'])
        except Exception as ex:
            venue_errors.append(f"{r['name']}: {ex}")

    venue_ids = {row[1]:row[0] for row in db.execute('SELECT id, google_place_id FROM venues WHERE google_place_id IS NOT NULL')}

    for r in eligible:
        vid = venue_ids.get(r['place_id'])
        if not vid: continue
        intel = r.get('intelligence', {})
        for field in ['intents','vibes','music','features','time','flow_roles','best_for']:
            atype = type_map[field]
            for a in intel.get(field, []):
                aname = a.get('name','')
                src = a.get('source','')
                conf = a.get('confidence', 0)
                if aname not in VALID_TAX.get(atype, set()):
                    attrs_skipped_tax += 1
                    tax_log.append(f"{r['name']} [{r['place_id'][:12]}]: {atype}:{aname}")
                    continue
                sig = 1.0 if src in ('observed','verified') else 0.5 if src == 'inferred' else 0.3
                try:
                    db.execute('''INSERT INTO venue_attributes
                        (venue_id, attribute_type, attribute, ai_confidence, signal_strength,
                         final_confidence, reasoning, model, evaluated_at)
                        VALUES (?,?,?,?,?,?,?,?,datetime('now'))''',
                        (vid, atype, aname, conf, sig, conf, src, 'gpt-4o-mini/v3.1-s3'))
                    attrs_inserted += 1
                except Exception as ex:
                    attr_errors.append(f"v:{vid} {r['name']}: {atype}:{aname} — {ex}")
        e = intel.get('energy', {})
        if isinstance(e, dict) and e.get('level') in VALID_TAX['energy']:
            try:
                db.execute('''INSERT INTO venue_attributes
                    (venue_id, attribute_type, attribute, ai_confidence, signal_strength,
                     final_confidence, reasoning, model, evaluated_at)
                    VALUES (?,?,?,?,?,?,?,?,datetime('now'))''',
                    (vid, 'energy', e['level'], e.get('confidence',0), 0.3,
                     e.get('confidence',0), e.get('source',''), 'gpt-4o-mini/v3.1-s3'))
                attrs_inserted += 1
            except Exception as ex:
                attr_errors.append(f"v:{vid} {r['name']}: energy:{e['level']} — {ex}")

    # VALIDATION
    print(f"\n{'='*50}")
    print(f"PRE-COMMIT VALIDATION")
    print(f"{'='*50}")
    v1 = venues_inserted == len(eligible) and len(venue_errors) == 0
    print(f"  {'✓' if v1 else '✗'} V1 Venues: {venues_inserted}/{len(eligible)}, errors: {len(venue_errors)}")
    if venue_errors:
        for e in venue_errors[:5]: print(f"    {e}")

    pid_dupes = {pid: db.execute("SELECT COUNT(*) FROM venues WHERE google_place_id=?", (pid,)).fetchone()[0] for pid in inserted_pids}
    pid_dupes = {k:v for k,v in pid_dupes.items() if v != 1}
    v2 = len(pid_dupes) == 0
    print(f"  {'✓' if v2 else '✗'} V2 Unique PIDs: {len(pid_dupes)} duplicates")

    no_coords = db.execute(f"SELECT COUNT(*) FROM venues WHERE google_place_id IN ({','.join('?' for _ in inserted_pids)}) AND (latitude IS NULL OR longitude IS NULL)", inserted_pids).fetchone()[0] if inserted_pids else 0
    v3 = no_coords == 0
    print(f"  {'✓' if v3 else '✗'} V3 Coords: {no_coords} missing")

    vids_with_attrs = 0
    for pid in inserted_pids:
        vid = venue_ids.get(pid)
        if vid and db.execute("SELECT COUNT(*) FROM venue_attributes WHERE venue_id=?", (vid,)).fetchone()[0] > 0:
            vids_with_attrs += 1
    v4 = vids_with_attrs == venues_inserted
    print(f"  {'✓' if v4 else '✗'} V4 All have attrs: {vids_with_attrs}/{venues_inserted}")

    v5 = True
    print(f"  ✓ V5 Provenance (pre-flight gated)")
    v6 = len(attr_errors) == 0
    print(f"  {'✓' if v6 else '✗'} V6 Attr errors: {len(attr_errors)}")
    if attr_errors:
        for e in attr_errors[:5]: print(f"    {e}")

    print(f"\n  Taxonomy stripped: {attrs_skipped_tax}")
    print(f"  Attrs inserted: {attrs_inserted}")

    critical_pass = v1 and v2 and v3 and v4 and v5 and v6
    if critical_pass:
        db.execute("COMMIT")
        committed = True
        print(f"\n✅ COMMITTED")
    else:
        db.execute("ROLLBACK")
        print(f"\n❌ ROLLED BACK")

except Exception as ex:
    try: db.execute("ROLLBACK")
    except: pass
    print(f"\n❌ ROLLED BACK — {ex}")
    import traceback; traceback.print_exc()

# POST REPORT
total_v = db.execute('SELECT COUNT(*) FROM venues WHERE is_active=1').fetchone()[0]
approved = db.execute("SELECT COUNT(*) FROM venues WHERE ingestion_status='approved'").fetchone()[0]
total_a = db.execute('SELECT COUNT(*) FROM venue_attributes').fetchone()[0]
by_region = db.execute("SELECT region, COUNT(*) FROM venues WHERE ingestion_status='approved' GROUP BY region").fetchall()
by_type = db.execute("SELECT venue_type, COUNT(*) FROM venues WHERE ingestion_status='approved' GROUP BY venue_type ORDER BY COUNT(*) DESC LIMIT 10").fetchall()

print(f"\n{'='*50}")
print(f"PRODUCTION DATABASE")
print(f"{'='*50}")
print(f"Active venues:      {total_v}")
print(f"Approved venues:    {approved}")
print(f"Total attributes:   {total_a}")
print(f"\nBy region:")
for r, c in by_region: print(f"  {r}: {c}")
print(f"\nBy venue type:")
for t, c in by_type: print(f"  {t}: {c}")

if committed:
    backup_post = f'/opt/viberyte/backups/lumina_post_scrape3_promotion_{ts}.db'
    shutil.copy('data/lumina.db', backup_post)
    print(f"\n✅ Post-backup: {backup_post}")

db.close()
