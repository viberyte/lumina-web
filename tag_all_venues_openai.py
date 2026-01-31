#!/usr/bin/env python3
import sqlite3
import requests
import time
import json

DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'
OPENAI_API_KEY = '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'
FINE_TUNED_MODEL = 'ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2'

BATCH_SIZE = 50

def classify_venue(venue_data):
    """Send venue to fine-tuned model for classification"""
    
    venue_id, name, category, city, address, description = venue_data
    
    prompt = f"""Classify this venue:

Name: {name}
Category: {category}
City: {city}
Address: {address}
Description: {description or 'N/A'}

Provide structured classification in JSON format:
{{
  "primary_vibes": ["vibe1", "vibe2", "vibe3"],
  "secondary_vibes": ["vibe4", "vibe5"],
  "mood_tags": ["mood1", "mood2"],
  "atmosphere_tags": ["atmosphere1", "atmosphere2"],
  "best_for": ["occasion1", "occasion2"],
  "energy_level": "low|medium|high",
  "acoustic_band": 1-5,
  "first_date_suitable": true|false,
  "girls_night_suitable": true|false,
  "guys_night_suitable": true|false,
  "anniversary_suitable": true|false,
  "pregame_suitable": true|false,
  "late_night_spot": true|false,
  "dress_code": "casual|smart casual|upscale",
  "vibe_intensity": 1-10,
  "crowd_type_tags": ["crowd type"],
  "known_for": "what makes this place special"
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
                    {'role': 'system', 'content': 'You are Lumina\'s venue classification AI. Classify venues with precision for nightlife recommendations.'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': 0.3,
                'max_tokens': 800
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            try:
                if '```json' in content:
                    content = content.split('```json')[1].split('```')[0]
                elif '```' in content:
                    content = content.split('```')[1].split('```')[0]
                
                classification = json.loads(content.strip())
                return classification
            except json.JSONDecodeError:
                print(f"   ⚠️  Could not parse JSON response")
                return None
        else:
            print(f"   ❌ API error: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

# Main
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== AI VENUE TAGGING WITH FINE-TUNED MODEL ===\n")
print(f"Model: {FINE_TUNED_MODEL}\n")

cursor.execute("""
    SELECT COUNT(*) 
    FROM venues 
    WHERE should_exclude = 0
    AND city IN (
        'New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
        'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia'
    )
""")
total_venues = cursor.fetchone()[0]

print(f"📊 Total venues to tag: {total_venues}")
print(f"⚡ Processing in batches of {BATCH_SIZE}\n")

processed = 0
tagged = 0
failed = 0

while processed < total_venues:
    cursor.execute("""
        SELECT id, name, category, city, address, description
        FROM venues
        WHERE should_exclude = 0
        AND city IN (
            'New York', 'Manhattan', 'Brooklyn', 'Queens', 'The Bronx',
            'North Jersey', 'South Jersey', 'Hoboken', 'Philadelphia'
        )
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
        venue_id, name, category, city, address, description = venue
        print(f"[{processed+1}/{total_venues}] {name} ({city})")
        
        classification = classify_venue(venue)
        
        if classification:
            cursor.execute("""
                UPDATE venues
                SET 
                    primary_vibes = ?,
                    secondary_vibes = ?,
                    mood_tags = ?,
                    atmosphere_tags = ?,
                    best_for = ?,
                    energy_level = ?,
                    acoustic_band = ?,
                    first_date_suitable = ?,
                    girls_night_suitable = ?,
                    guys_night_suitable = ?,
                    anniversary_suitable = ?,
                    pregame_suitable = ?,
                    late_night_spot = ?,
                    dress_code = ?,
                    vibe_intensity = ?,
                    crowd_type_tags = ?,
                    known_for = ?,
                    last_enhanced = CURRENT_TIMESTAMP,
                    enhancement_version = 'lumina-v1'
                WHERE id = ?
            """, (
                json.dumps(classification.get('primary_vibes', [])),
                json.dumps(classification.get('secondary_vibes', [])),
                json.dumps(classification.get('mood_tags', [])),
                json.dumps(classification.get('atmosphere_tags', [])),
                json.dumps(classification.get('best_for', [])),
                classification.get('energy_level'),
                classification.get('acoustic_band', 2),
                1 if classification.get('first_date_suitable') else 0,
                1 if classification.get('girls_night_suitable') else 0,
                1 if classification.get('guys_night_suitable') else 0,
                1 if classification.get('anniversary_suitable') else 0,
                1 if classification.get('pregame_suitable') else 0,
                1 if classification.get('late_night_spot') else 0,
                classification.get('dress_code'),
                classification.get('vibe_intensity', 5),
                json.dumps(classification.get('crowd_type_tags', [])),
                classification.get('known_for'),
                venue_id
            ))
            
            tagged += 1
            print(f"   ✅ Tagged: {classification.get('energy_level')} energy, vibes: {', '.join(classification.get('primary_vibes', [])[:3])}")
        else:
            failed += 1
        
        processed += 1
        time.sleep(0.5)
    
    conn.commit()
    print(f"\n✅ Batch complete - saved to database")

conn.close()

print(f"\n{'='*60}")
print(f"=== TAGGING COMPLETE ===")
print(f"✅ Successfully tagged: {tagged}/{total_venues}")
print(f"❌ Failed: {failed}")
print(f"\n🎉 ALL VENUES NOW HAVE AI-POWERED INTELLIGENCE!")
