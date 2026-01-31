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
