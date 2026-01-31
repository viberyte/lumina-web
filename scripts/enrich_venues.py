import sqlite3
import json
import openai
import os

# --- CONFIG ---
OPENAI_API_KEY = "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" 
MODEL_ID = "ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2"
DB_PATH = '/opt/viberyte/lumina-web/data/lumina.db'

client = openai.OpenAI(api_key=OPENAI_API_KEY)

def run_enrichment():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Create table if not exists
    cur.execute("""
        CREATE TABLE IF NOT EXISTS venue_intelligence (
            venue_id INTEGER PRIMARY KEY,
            ai_vibe_summary TEXT,
            weekly_specials_json TEXT,
            best_uses TEXT,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Find venues with media but no intelligence yet
    cur.execute("""
        SELECT DISTINCT venue_id FROM venue_instagram_media 
        WHERE venue_id NOT IN (SELECT venue_id FROM venue_intelligence)
        LIMIT 50;
    """)
    venues = cur.fetchall()

    if not venues:
        print("📭 No new venues to process.")
        return

    for (v_id,) in venues:
        print(f"🧐 CAT reading Vibe for Venue {v_id}...")
        
        cur.execute("SELECT caption FROM venue_instagram_media WHERE venue_id = ? AND caption IS NOT NULL LIMIT 15", (v_id,))
        captions = [c[0] for c in cur.fetchall()]
        
        if not captions:
            continue
        
        context_text = " | ".join(captions)

        try:
            response = client.chat.completions.create(
                model=MODEL_ID,
                messages=[
                    {"role": "system", "content": "Extract: 1. 'vibe_summary' (positive). 2. 'specials' (Bottomless, Happy Hour). 3. 'best_for'. Return ONLY JSON."},
                    {"role": "user", "content": f"Analyze: {context_text}"}
                ],
                response_format={"type": "json_object"}
            )

            data = json.loads(response.choices[0].message.content)
            
            cur.execute("""
                INSERT INTO venue_intelligence (venue_id, ai_vibe_summary, weekly_specials_json, best_uses)
                VALUES (?, ?, ?, ?)
            """, (
                v_id, 
                data.get('vibe_summary'), 
                json.dumps(data.get('specials')), 
                str(data.get('best_for'))
            ))
            conn.commit()
            print(f"✅ Venue {v_id} enriched.")

        except Exception as e:
            print(f"⚠️ Error on {v_id}: {e}")

    conn.close()

if __name__ == "__main__":
    run_enrichment()
