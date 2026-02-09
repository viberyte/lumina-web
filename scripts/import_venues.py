import json
import sqlite3
from datetime import datetime

venues = json.load(open('data/venues_to_import.json'))
print(f"Importing {len(venues)} venues with Instagram content...\n")

db = sqlite3.connect('data/lumina.db')
cur = db.cursor()

cur.execute("SELECT google_place_id FROM venues WHERE google_place_id IS NOT NULL")
existing_place_ids = set(row[0] for row in cur.fetchall())
print(f"Existing venues with place_id: {len(existing_place_ids)}")

inserted = 0
updated = 0
skipped = 0

for v in venues:
    place_id = v.get('google_place_id', '')
    world = v.get('ai_world', '')
    is_nightlife = world in ['outside', 'latin_nights', 'pulse', 'low_light']
    
    data = {
        'name': v.get('name', ''),
        'instagram_handle': v.get('instagram_handle', ''),
        'category': 'lounge' if is_nightlife else 'restaurant',
        'subcategory': world,
        'address': v.get('address', ''),
        'city': v.get('city', '').title(),
        'state': 'NY' if v.get('city', '').lower() in ['manhattan', 'brooklyn', 'queens', 'bronx'] else 'NJ',
        'phone': v.get('phone', ''),
        'website': v.get('website', ''),
        'latitude': v.get('lat'),
        'longitude': v.get('lng'),
        'google_place_id': place_id,
        'google_rating': v.get('rating'),
        'google_reviews_count': v.get('reviews_count'),
        'google_price_level': v.get('price_level'),
        'hours_json': json.dumps(v.get('hours', {}).get('weekday_text', [])) if v.get('hours') else '[]',
        'place_types': json.dumps(v.get('google_types', [])),
        'top_reviews': json.dumps(v.get('top_reviews', [])),
        'description': v.get('editorial_summary', ''),
        
        # AI classification
        'primary_lens': world,
        'primary_vibes': json.dumps(v.get('ai_vibes', [])),
        'vibe_tags': json.dumps(v.get('ai_vibes', [])),
        'energy_level': str(v.get('ai_energy', 5)),
        'price_tier': v.get('ai_price_tier', 'moderate'),
        'primary_scene': v.get('ai_scene_candidate', 'none'),
        
        # Instagram content
        'instagram_url': f"https://instagram.com/{v.get('instagram_handle', '')}",
        'gallery_photos': json.dumps(v.get('ig_photos', [])[:10]),
        'instagram_tagged_posts': json.dumps(v.get('ig_posts', [])[:10]),
        'professional_photos': json.dumps(v.get('ig_photos', [])[:5]),
        'image_url': v.get('ig_photos', [None])[0] if v.get('ig_photos') else None,
        'professional_photo_url': v.get('ig_photos', [None])[0] if v.get('ig_photos') else None,
        
        # Metadata
        'scraped_from': 'google_places_2026',
        'viberyte_certified': 1,
        'explore_ready': 1,
        'has_photo': 1 if v.get('ig_photos') else 0,
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'primary_category': 'lounge' if is_nightlife else 'restaurant',
        'standardized_category': 'nightlife' if is_nightlife else 'dining',
    }
    
    if place_id in existing_place_ids:
        update_fields = ['instagram_handle', 'gallery_photos', 'instagram_tagged_posts', 
                        'professional_photos', 'image_url', 'primary_lens', 'primary_vibes',
                        'vibe_tags', 'energy_level', 'primary_scene', 'viberyte_certified',
                        'explore_ready', 'updated_at']
        set_clause = ', '.join([f"{f} = ?" for f in update_fields])
        values = [data[f] for f in update_fields] + [place_id]
        cur.execute(f"UPDATE venues SET {set_clause} WHERE google_place_id = ?", values)
        updated += 1
    else:
        columns = list(data.keys())
        placeholders = ', '.join(['?' for _ in columns])
        col_names = ', '.join(columns)
        values = [data[c] for c in columns]
        
        try:
            cur.execute(f"INSERT INTO venues ({col_names}) VALUES ({placeholders})", values)
            inserted += 1
        except Exception as e:
            print(f"  ⚠️ Error inserting {data['name']}: {e}")
            skipped += 1

db.commit()
db.close()

print(f"\n{'='*50}")
print(f"  IMPORT COMPLETE")
print(f"{'='*50}")
print(f"✅ Inserted: {inserted}")
print(f"🔄 Updated: {updated}")
print(f"⚠️ Skipped: {skipped}")
print(f"Total: {inserted + updated}")
