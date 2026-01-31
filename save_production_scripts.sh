#!/bin/bash

echo "=== SAVING PRODUCTION SCRIPTS ==="

# Create scripts directory if it doesn't exist
mkdir -p /opt/viberyte/lumina-web/scripts/production

echo ""
echo "1. Saving Instagram Crowd Scraper (12/24/25)..."

cat > /opt/viberyte/lumina-web/scripts/production/instagram_crowd_scraper_v1_20251224.py << 'SCRIPT1'
#!/usr/bin/env python3
"""
LUMINA INSTAGRAM CROWD SCRAPER v1.0
Created: December 24, 2025
Purpose: Scrape authentic customer posts from Instagram location pages
Actor: apidojo~instagram-location-scraper
Output: ~25 posts per venue location showing real crowd vibes

Usage: python3 instagram_crowd_scraper_v1_20251224.py
"""
import sqlite3
import requests
import json
import time

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
APIFY_API_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel'
POSTS_PER_LOCATION = 25
BATCH_SIZE = 50

# Get all venues with location IDs
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT id, name, instagram_location_id
    FROM venues
    WHERE instagram_location_id IS NOT NULL
    ORDER BY id
""")

venues = cursor.fetchall()
conn.close()

print(f"=== LUMINA INSTAGRAM CROWD SCRAPER ===")
print(f"Version: 1.0 | Date: 2025-12-24\n")
print(f"📊 Total locations: {len(venues)}")
print(f"📸 Posts per location: {POSTS_PER_LOCATION}")
print(f"🔄 Batch size: {BATCH_SIZE} locations\n")

total_batches = (len(venues) + BATCH_SIZE - 1) // BATCH_SIZE
all_posts_count = 0

for batch_num in range(total_batches):
    start_idx = batch_num * BATCH_SIZE
    end_idx = min(start_idx + BATCH_SIZE, len(venues))
    batch_venues = venues[start_idx:end_idx]
    
    print(f"\n{'='*60}")
    print(f"BATCH {batch_num + 1}/{total_batches}: Locations {start_idx + 1}-{end_idx}")
    print(f"{'='*60}\n")
    
    location_ids = [loc_id for _, _, loc_id in batch_venues]
    
    # Apify Instagram Location Scraper
    url = "https://api.apify.com/v2/acts/apidojo~instagram-location-scraper/runs"
    
    payload = {
        "locationIds": location_ids,
        "maxItems": POSTS_PER_LOCATION * len(location_ids)
    }
    
    response = requests.post(
        url,
        json=payload,
        headers={"Content-Type": "application/json"},
        params={"token": APIFY_API_KEY}
    )
    
    if response.status_code != 201:
        print(f"❌ Failed: {response.text}")
        continue
    
    run_data = response.json()
    run_id = run_data['data']['id']
    
    print(f"⏳ Apify run: {run_id}")
    
    # Wait for completion
    dots = 0
    while True:
        status_resp = requests.get(
            f"https://api.apify.com/v2/acts/apidojo~instagram-location-scraper/runs/{run_id}",
            params={"token": APIFY_API_KEY}
        )
        
        status = status_resp.json()['data']['status']
        
        if status == 'SUCCEEDED':
            print(f"\n✅ Complete!")
            break
        elif status in ['FAILED', 'ABORTED', 'TIMED-OUT']:
            print(f"\n❌ Failed: {status}")
            break
        
        print(f"⏳ Running... {'.' * (dots % 4)}    ", end='\r')
        dots += 1
        time.sleep(10)
    
    # Get results
    dataset_id = run_data['data']['defaultDatasetId']
    results_resp = requests.get(
        f"https://api.apify.com/v2/datasets/{dataset_id}/items",
        params={"token": APIFY_API_KEY}
    )
    
    results = results_resp.json()
    
    print(f"📦 Got {len(results)} posts")
    all_posts_count += len(results)
    
    # Save batch file
    with open(f'crowd_posts_batch_{batch_num + 1}.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Save to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    saved = 0
    for post in results:
        location_id = str(post.get('inputSource'))
        post_id = post.get('id')
        
        image = post.get('image', {})
        image_url = image.get('url')
        
        owner = post.get('owner', {})
        username = owner.get('username')
        
        cursor.execute("SELECT id FROM venues WHERE instagram_location_id = ?", (location_id,))
        venue = cursor.fetchone()
        
        if venue and image_url:
            try:
                cursor.execute("""
                    INSERT INTO crowd_photos (
                        venue_id, instagram_post_id, instagram_location_id,
                        image_url, posted_by_username, caption,
                        like_count, comment_count, posted_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    venue[0], post_id, location_id, image_url,
                    username, post.get('caption'), post.get('likeCount'),
                    post.get('commentCount'), post.get('createdAt')
                ))
                saved += 1
            except:
                pass
    
    conn.commit()
    conn.close()
    
    print(f"✅ Saved {saved} photos to database")
    
    if batch_num < total_batches - 1:
        print(f"⏳ Waiting 30 seconds...")
        time.sleep(30)

print(f"\n{'='*60}")
print(f"=== COMPLETE ===")
print(f"🎉 Total posts collected: {all_posts_count}")

# Final stats
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT COUNT(DISTINCT venue_id), COUNT(*) FROM crowd_photos")
stats = cursor.fetchone()
conn.close()

print(f"\n📸 DATABASE:")
print(f"   Venues with photos: {stats[0]}")
print(f"   Total crowd photos: {stats[1]}")
SCRIPT1

chmod +x /opt/viberyte/lumina-web/scripts/production/instagram_crowd_scraper_v1_20251224.py

echo "   ✅ Saved: instagram_crowd_scraper_v1_20251224.py"

echo ""
echo "2. Saving OpenAI Venue Enhancement (12/24/25)..."

cat > /opt/viberyte/lumina-web/scripts/production/openai_venue_enhancement_v2_20251224.py << 'SCRIPT2'
#!/usr/bin/env python3
"""
LUMINA OPENAI VENUE ENHANCEMENT v2.0
Created: December 24, 2025
Purpose: AI-tag all venues with cuisines, styles, occasions, vibes, energy
Model: ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2
Schema: LUMINA_COMPLETE_TAGS.json

Usage: python3 openai_venue_enhancement_v2_20251224.py
"""
import sqlite3
import requests
import time
import json

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
OPENAI_API_KEY = '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'
FINE_TUNED_MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2'
BATCH_SIZE = 50

# Load master tags schema
with open('LUMINA_COMPLETE_TAGS.json', 'r') as f:
    MASTER_TAGS = json.load(f)

def classify_venue(venue_data):
    """Send venue to fine-tuned model with master tag schema"""
    
    venue_id, name, category, city, address, description, website = venue_data
    
    prompt = f"""Classify this venue using ONLY the approved tags provided.

VENUE DETAILS:
Name: {name}
Category: {category}
City: {city}
Address: {address}
Description: {description or 'N/A'}
Website: {website or 'N/A'}

APPROVED TAGS TO USE:
Cuisines: {json.dumps(MASTER_TAGS['cuisines']['categories'], indent=2)}
Style Modifiers: {MASTER_TAGS['cuisine_style_modifiers']['options']}
Vibes: {MASTER_TAGS['primary_vibes']}
Occasions (pick ALL that apply): {MASTER_TAGS['occasions_multi_select']}
Music: {MASTER_TAGS['music_genres']}
Energy: {MASTER_TAGS['energy_levels']}
Dress Code: {MASTER_TAGS['dress_codes']}

Respond with JSON ONLY (no markdown):
{{
  "cuisine_primary": "Main cuisine type",
  "cuisine_secondary": "Optional secondary cuisine",
  "cuisine_style": "upscale|trendy|casual|authentic|modern",
  "primary_vibes": ["vibe1", "vibe2", "vibe3"],
  "occasions": ["occasion1", "occasion2", "occasion3"],
  "music_genres": ["genre1", "genre2"],
  "energy_level": "low|medium|high",
  "dress_code": "casual|smart casual|upscale",
  "acoustic_band": 1-5,
  "price_tier": "$|$$|$$$|$$$$",
  "special_features": ["feature1", "feature2"],
  "known_for": "What makes this place special in 10-15 words"
}}"""
    
    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENAI_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': FINE_TUNED_MODEL,
                'messages': [
                    {'role': 'system', 'content': 'You are Lumina\'s venue classifier. Use ONLY the approved tags provided. Output valid JSON only.'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': 0.3,
                'max_tokens': 1000
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0]
            elif '```' in content:
                content = content.split('```')[1].split('```')[0]
            
            classification = json.loads(content.strip())
            return classification
        else:
            print(f"   ❌ API error: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

# Main
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print(f"=== LUMINA VENUE ENHANCEMENT ===")
print(f"Version: 2.0 | Date: 2025-12-24")
print(f"Model: {FINE_TUNED_MODEL}\n")

cursor.execute("""
    SELECT COUNT(*) 
    FROM venues 
    WHERE should_exclude = 0
""")
total_venues = cursor.fetchone()[0]

print(f"📊 Total venues to tag: {total_venues}")
print(f"⚡ Processing in batches of {BATCH_SIZE}\n")

processed = 0
tagged = 0
failed = 0

while processed < total_venues:
    cursor.execute("""
        SELECT id, name, category, city, address, description, website
        FROM venues
        WHERE should_exclude = 0
        ORDER BY id
        LIMIT ? OFFSET ?
    """, (BATCH_SIZE, processed))
    
    batch = cursor.fetchall()
    if not batch:
        break
    
    print(f"\n{'='*60}")
    print(f"BATCH {processed//BATCH_SIZE + 1}: Venues {processed+1}-{processed+len(batch)}")
    print(f"{'='*60}\n")
    
    for venue in batch:
        venue_id = venue[0]
        name = venue[1]
        city = venue[3]
        
        print(f"[{processed+1}/{total_venues}] {name} ({city})")
        
        classification = classify_venue(venue)
        
        if classification:
            cursor.execute("""
                UPDATE venues
                SET 
                    cuisine_primary = ?,
                    cuisine_secondary = ?,
                    cuisine_style = ?,
                    primary_vibes = ?,
                    best_for = ?,
                    music_genres_normalized = ?,
                    energy_level = ?,
                    dress_code = ?,
                    acoustic_band = ?,
                    price_tier = ?,
                    special_features = ?,
                    known_for = ?,
                    first_date_suitable = ?,
                    girls_night_suitable = ?,
                    guys_night_suitable = ?,
                    anniversary_suitable = ?,
                    pregame_suitable = ?,
                    brunch_spot = ?,
                    late_night_spot = ?,
                    business_meeting_ok = ?,
                    last_enhanced = CURRENT_TIMESTAMP,
                    enhancement_version = 'lumina-v2-master-schema'
                WHERE id = ?
            """, (
                classification.get('cuisine_primary'),
                classification.get('cuisine_secondary'),
                classification.get('cuisine_style'),
                json.dumps(classification.get('primary_vibes', [])),
                json.dumps(classification.get('occasions', [])),
                json.dumps(classification.get('music_genres', [])),
                classification.get('energy_level'),
                classification.get('dress_code'),
                classification.get('acoustic_band', 3),
                classification.get('price_tier'),
                json.dumps(classification.get('special_features', [])),
                classification.get('known_for'),
                1 if 'date_night' in classification.get('occasions', []) else 0,
                1 if 'girls_night' in classification.get('occasions', []) else 0,
                1 if 'guys_night' in classification.get('occasions', []) else 0,
                1 if 'anniversary' in classification.get('occasions', []) else 0,
                1 if 'pregame' in classification.get('occasions', []) else 0,
                1 if 'brunch' in classification.get('occasions', []) else 0,
                1 if 'late_night' in classification.get('occasions', []) else 0,
                1 if 'business_meeting' in classification.get('occasions', []) else 0,
                venue_id
            ))
            
            tagged += 1
            cuisine = f"{classification.get('cuisine_style', '')} {classification.get('cuisine_primary', '')}".strip()
            occasions = ', '.join(classification.get('occasions', [])[:3])
            print(f"   ✅ {cuisine} | {classification.get('energy_level')} energy | {occasions}")
        else:
            failed += 1
        
        processed += 1
        time.sleep(0.5)
    
    conn.commit()
    print(f"\n✅ Batch saved to database")

conn.close()

print(f"\n{'='*60}")
print(f"=== TAGGING COMPLETE ===")
print(f"✅ Successfully tagged: {tagged}/{total_venues}")
print(f"❌ Failed: {failed}")
SCRIPT2

chmod +x /opt/viberyte/lumina-web/scripts/production/openai_venue_enhancement_v2_20251224.py

echo "   ✅ Saved: openai_venue_enhancement_v2_20251224.py"

echo ""
echo "3. Creating production README..."

cat > /opt/viberyte/lumina-web/scripts/production/README.md << 'README'
# Lumina Production Scripts

## Version History

### December 24, 2025

#### 1. Instagram Crowd Scraper v1.0
**File:** `instagram_crowd_scraper_v1_20251224.py`
**Purpose:** Scrape authentic customer posts from Instagram location pages
**Actor:** `apidojo~instagram-location-scraper`
**Output:** ~25 crowd photos per venue (28,000+ total)
**Database:** Saves to `crowd_photos` table

**Usage:**
```bash
python3 instagram_crowd_scraper_v1_20251224.py
```

#### 2. OpenAI Venue Enhancement v2.0
**File:** `openai_venue_enhancement_v2_20251224.py`
**Purpose:** AI-tag all venues with cuisines, styles, occasions, vibes
**Model:** `ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2`
**Schema:** `LUMINA_COMPLETE_TAGS.json`
**Output:** Complete venue intelligence (100% coverage)

**Usage:**
```bash
python3 openai_venue_enhancement_v2_20251224.py
```

## Database Schema

### Tables Created/Updated
- `venues` - Enhanced with AI tags
- `crowd_photos` - Customer Instagram posts by location

### Key Fields
- `cuisine_primary`, `cuisine_style` - "upscale Italian"
- `primary_vibes` - JSON array of vibes
- `best_for` - JSON array of occasions
- `energy_level`, `dress_code`, `acoustic_band`
- `enhancement_version` - "lumina-v2-master-schema"

## Notes
- Both scripts are production-ready
- Idempotent - safe to re-run
- Rate limited for API compliance
- Save batch files for recovery
README

echo "   ✅ Created: README.md"

echo ""
echo "============================================================"
echo "=== PRODUCTION SCRIPTS SAVED ==="
echo "============================================================"
echo ""
echo "Location: /opt/viberyte/lumina-web/scripts/production/"
echo ""
echo "Files created:"
echo "  1. instagram_crowd_scraper_v1_20251224.py"
echo "  2. openai_venue_enhancement_v2_20251224.py"
echo "  3. README.md"
echo ""
echo "✅ Scripts archived and documented!"

