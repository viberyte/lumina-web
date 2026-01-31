import sqlite3
import json
import time
from openai import OpenAI

client = OpenAI(api_key="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")
MODEL_ID = "ft:gpt-4o-mini-2024-07-18:viberyte:lumina-nightlife-v1:Cl4g83K2"

def deep_enrich():
    conn = sqlite3.connect('/opt/viberyte/lumina-web/data/lumina.db')
    cur = conn.cursor()

    cur.execute("""
        SELECT v.id, v.name, GROUP_CONCAT(m.caption, ' | ') as all_captions
        FROM venues v
        JOIN venue_instagram_media m ON v.id = m.venue_id
        GROUP BY v.id
    """)
    
    venues = cur.fetchall()
    print(f"🚀 Processing {len(venues)} venues for Personality Archetypes...")

    for index, (venue_id, name, captions) in enumerate(venues, 1):
        if not captions or len(captions) < 10: continue
        
        try:
            response = client.chat.completions.create(
                model=MODEL_ID,
                messages=[
                    {"role": "system", "content": "You are the Lumina Social Matchmaker. Categorize venues by their soul and crowd. Return ONLY JSON."},
                    {"role": "user", "content": f"""
                        Analyze captions for '{name}' and assign these EXACT tags if mentioned or implied:
                        - LGBTQ_friendly: (Yes/No)
                        - Single_Target: (Single Ladies / Single Men / Both / None)
                        - Date_Night_Score: (1-10)
                        - Social_Goal: (Dating, Dancing, Networking, Chill)
                        - Atmosphere: (High Energy, Elegant, Underground, Inclusive)
                        - Peak_Days: (List of days)

                        Captions: {captions[:5000]}
                    """}
                ],
                response_format={ "type": "json_object" }
            )

            res_json = response.choices[0].message.content
            data = json.loads(res_json)

            # Creating the 'Personality Tag' string for the UI
            p_tags = []
            if data.get('LGBTQ_friendly') == 'Yes': p_tags.append("LGBTQ+ Friendly")
            if data.get('Single_Target'): p_tags.append(data['Single_Target'])
            if data.get('Date_Night_Score', 0) > 7: p_tags.append("Top Date Spot")
            p_tags.append(data.get('Social_Goal', ''))
            p_tags.extend(data.get('Peak_Days', []))

            final_string = ", ".join(list(set([t for t in p_tags if t])))

            cur.execute("""
                INSERT INTO venue_intelligence (venue_id, weekly_specials_json, personality_tags)
                VALUES (?, ?, ?)
                ON CONFLICT(venue_id) DO UPDATE SET 
                    weekly_specials_json = excluded.weekly_specials_json,
                    personality_tags = excluded.personality_tags
            """, (venue_id, res_json, final_string))
            
            conn.commit()
            print(f"[{index}/{len(venues)}] ✅ {name}: {final_string}")
        except Exception as e:
            print(f"❌ Error at {name}: {e}")

    conn.close()

if __name__ == "__main__":
    deep_enrich()
