const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Add voice_key column if not exists
try {
  db.exec(`ALTER TABLE venue_insights ADD COLUMN voice_key TEXT DEFAULT 'neutral'`);
  console.log('Added voice_key column');
} catch (e) {
  console.log('voice_key column exists');
}

// Get existing neutral insights
const insights = db.prepare(`
  SELECT DISTINCT venue_id, insight_type, insight_text, context_tags, time_relevance, display_priority
  FROM venue_insights 
  WHERE voice_key = 'neutral' OR voice_key IS NULL
`).all();

console.log(`Processing ${insights.length} insights for tone variants...`);

// Tone transforms
const toneTransforms = {
  young_male: {
    "Don't rush—it picks up after 11.": "Don't rush—it goes off after 11.",
    "Best to arrive around": "Pull up around",
    "Chill spot, easy to have a conversation.": "Chill spot, easy to talk.",
    "Expect high energy and a packed crowd.": "Gets packed. Bring energy.",
    "Solid vibe without being overwhelming.": "Solid vibe, not too crazy.",
    "Rooftop views, weather permitting.": "Rooftop views. Worth it.",
    "Great date spot, lots of couples.": "Good date spot if that's the move.",
    "Group-friendly, easy to take over a section.": "Easy to run it with the squad.",
    "DJ spins here, gets loud later.": "DJ goes crazy later.",
    "Good warmup spot before the main event.": "Solid pregame spot.",
    "Keeps going when other spots close.": "Stays open when everything else shuts down.",
    "Intimate setting, good for dates.": "Low key date spot.",
    "Trendy crowd, dress to impress.": "Trendy crowd, dress fresh.",
    "Hookah available, good for lingering.": "They got hookah if you're tryna chill.",
    "Bottle service available, book ahead for groups.": "Bottle service if you're going big.",
    "Dance floor gets packed after midnight.": "Dance floor goes crazy after midnight.",
    "Easy to talk here, not too loud.": "Easy to talk, not too loud.",
  },
  young_female: {
    "Don't rush—it picks up after 11.": "Don't rush—it picks up after 11. Trust.",
    "Best to arrive around": "Get there around",
    "Chill spot, easy to have a conversation.": "Chill vibes, perfect for catching up.",
    "Expect high energy and a packed crowd.": "It gets packed—in the best way.",
    "Solid vibe without being overwhelming.": "Great vibe without being too much.",
    "Rooftop views, weather permitting.": "Rooftop views. So cute.",
    "Great date spot, lots of couples.": "Such a good date spot.",
    "Group-friendly, easy to take over a section.": "Perfect for the girls.",
    "DJ spins here, gets loud later.": "DJ's actually good here.",
    "Good warmup spot before the main event.": "Cute pregame spot.",
    "Keeps going when other spots close.": "Stays open late if you're not ready to go home.",
    "Intimate setting, good for dates.": "Intimate and so romantic.",
    "Trendy crowd, dress to impress.": "Trendy crowd, love the vibe.",
    "Hookah available, good for lingering.": "They have hookah if you want to stay a while.",
    "Bottle service available, book ahead for groups.": "Bottle service available—perfect for birthdays!",
    "Dance floor gets packed after midnight.": "Dance floor is so fun after midnight.",
    "Easy to talk here, not too loud.": "Easy to actually talk here.",
  },
  mature_professional: {
    "Don't rush—it picks up after 11.": "The atmosphere develops after 11 PM.",
    "Best to arrive around": "Optimal arrival around",
    "Chill spot, easy to have a conversation.": "Conducive to conversation.",
    "Expect high energy and a packed crowd.": "Expect a lively, well-attended crowd.",
    "Solid vibe without being overwhelming.": "Pleasant atmosphere without excess.",
    "Rooftop views, weather permitting.": "Notable rooftop with excellent views.",
    "Great date spot, lots of couples.": "Well-suited for a dinner date.",
    "Group-friendly, easy to take over a section.": "Accommodates groups comfortably.",
    "DJ spins here, gets loud later.": "Live DJ later in the evening.",
    "Good warmup spot before the main event.": "An excellent starting point.",
    "Keeps going when other spots close.": "Extended hours for the evening.",
    "Intimate setting, good for dates.": "Intimate setting, ideal for a date.",
    "Trendy crowd, dress to impress.": "Sophisticated crowd, dress accordingly.",
    "Hookah available, good for lingering.": "Hookah lounge available.",
    "Bottle service available, book ahead for groups.": "Bottle service available with advance reservation.",
    "Dance floor gets packed after midnight.": "The dance floor becomes active later.",
    "Easy to talk here, not too loud.": "Appropriate volume for conversation.",
  }
};

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO venue_insights 
  (venue_id, insight_type, insight_text, context_tags, time_relevance, display_priority, voice_key)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const updateNeutral = db.prepare(`
  UPDATE venue_insights SET voice_key = 'neutral' 
  WHERE venue_id = ? AND insight_text = ? AND (voice_key IS NULL OR voice_key = '')
`);

// Wrap in transaction
db.exec('BEGIN TRANSACTION');

try {
  let inserted = 0;

  for (const insight of insights) {
    // Mark original as neutral
    updateNeutral.run(insight.venue_id, insight.insight_text);
    
    // Create variants for each voice
    for (const [voiceKey, transforms] of Object.entries(toneTransforms)) {
      let newText = insight.insight_text;
      
      // Apply transforms
      for (const [original, replacement] of Object.entries(transforms)) {
        if (newText.includes(original)) {
          newText = newText.replace(original, replacement);
        }
      }
      
      // Only insert if different from original
      if (newText !== insight.insight_text) {
        insertStmt.run(
          insight.venue_id,
          insight.insight_type,
          newText,
          insight.context_tags,
          insight.time_relevance,
          insight.display_priority,
          voiceKey
        );
        inserted++;
      }
    }
  }

  db.exec('COMMIT');
  console.log(`\n✅ Created ${inserted} tone variants`);

} catch (e) {
  db.exec('ROLLBACK');
  console.error('Error:', e);
  throw e;
}

// Show samples
const samples = db.prepare(`
  SELECT voice_key, insight_text 
  FROM venue_insights 
  WHERE insight_type = 'vibe' 
    AND insight_text LIKE '%packed%'
  ORDER BY voice_key
  LIMIT 4
`).all();

console.log('\nSample "packed" insight variants:');
console.table(samples);

// Count by voice
const counts = db.prepare(`
  SELECT voice_key, COUNT(*) as count 
  FROM venue_insights 
  GROUP BY voice_key
`).all();

console.log('\nInsights by voice:');
console.table(counts);

db.close();
