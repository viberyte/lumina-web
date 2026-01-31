/**
 * LUMINA V2 - Event Enhancement Script
 * =====================================
 * Uses OpenAI to generate vibe tags and descriptions for all events
 */

import Database from 'better-sqlite3';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/lumina.db');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class EventEnhancer {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = { processed: 0, enhanced: 0, errors: 0, skipped: 0 };
    this.batchSize = 10; // Process 10 at a time to avoid rate limits
  }

  async enhanceEvent(event) {
    try {
      const prompt = `You are a nightlife expert analyzing an event. Generate vibe tags and a compelling bio.

EVENT DETAILS:
- Name: ${event.name}
- Venue: ${event.venue_name || 'Unknown'}
- Date: ${event.date}
- City: ${event.city || 'New York'}
- Current Description: ${event.description || 'None'}

TASK:
1. Generate 3-6 vibe tags from this list: afrobeats, amapiano, hip-hop, r&b, reggae, dancehall, latin, reggaeton, house, techno, soul, jazz, rooftop, lounge, club, dive-bar, upscale, casual, brunch, late-night, live-music, dj, karaoke, nye, holiday, lgbtq, artsy, chill, high-energy

2. Write a 2-3 sentence bio that makes someone excited to attend. Focus on the vibe, music, and experience. Be concise and engaging.

Respond ONLY with valid JSON in this exact format:
{
  "vibe_tags": ["tag1", "tag2", "tag3"],
  "bio": "Your compelling 2-3 sentence description here."
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a nightlife expert. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const content = response.choices[0].message.content.trim();
      
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const result = JSON.parse(cleanContent);
      
      return {
        vibe_tags: JSON.stringify(result.vibe_tags || []),
        description: result.bio || event.description
      };
      
    } catch (error) {
      console.error(`  ✗ Error enhancing event: ${error.message}`);
      return null;
    }
  }

  async updateEvent(eventId, enhancement) {
    const stmt = this.db.prepare(`
      UPDATE events 
      SET vibe_tags = ?, 
          description = ?,
          enriched_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      enhancement.vibe_tags,
      enhancement.description,
      new Date().toISOString(),
      eventId
    );
  }

  async run() {
    console.log('🤖 LUMINA V2 - AI Event Enhancement');
    console.log('='.repeat(70));
    console.log('🎯 Using OpenAI GPT-4o-mini\n');

    // Get all upcoming events
    const events = this.db.prepare(`
      SELECT id, name, venue_name, date, city, description, vibe_tags
      FROM events 
      WHERE date >= date('now')
      ORDER BY date ASC
    `).all();

    console.log(`📊 Found ${events.length} upcoming events to enhance\n`);

    // Process in batches
    for (let i = 0; i < events.length; i += this.batchSize) {
      const batch = events.slice(i, i + this.batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / this.batchSize) + 1} (${i + 1}-${Math.min(i + this.batchSize, events.length)} of ${events.length})`);
      console.log('='.repeat(70));
      
      for (const event of batch) {
        this.stats.processed++;
        
        try {
          // Check if already has good tags and description
          const currentTags = event.vibe_tags ? JSON.parse(event.vibe_tags) : [];
          if (currentTags.length >= 3 && event.description && event.description.length > 50) {
            console.log(`  ⊘ ${event.name.substring(0, 50)} (already enhanced)`);
            this.stats.skipped++;
            continue;
          }

          console.log(`  🔄 Enhancing: ${event.name.substring(0, 50)}...`);
          
          const enhancement = await this.enhanceEvent(event);
          
          if (enhancement) {
            await this.updateEvent(event.id, enhancement);
            this.stats.enhanced++;
            
            const tags = JSON.parse(enhancement.vibe_tags);
            console.log(`  ✓ Tags: ${tags.join(', ')}`);
            console.log(`  ✓ Bio: ${enhancement.description.substring(0, 80)}...`);
          } else {
            this.stats.errors++;
          }
          
          // Small delay to respect rate limits
          await new Promise(r => setTimeout(r, 500));
          
        } catch (error) {
          this.stats.errors++;
          console.error(`  ✗ Failed: ${error.message}`);
        }
      }
      
      // Longer delay between batches
      if (i + this.batchSize < events.length) {
        console.log('\n⏳ Cooling down for 3 seconds...');
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    this.db.close();

    // Print final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 ENHANCEMENT COMPLETE');
    console.log('='.repeat(70));
    console.log(`✓ Processed: ${this.stats.processed} events`);
    console.log(`✓ Enhanced: ${this.stats.enhanced} events`);
    console.log(`⊘ Skipped: ${this.stats.skipped} (already good)`);
    console.log(`✗ Errors: ${this.stats.errors}`);
    console.log('='.repeat(70) + '\n');
  }
}

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

// Run enhancer
const enhancer = new EventEnhancer();
enhancer.run().catch(console.error);
