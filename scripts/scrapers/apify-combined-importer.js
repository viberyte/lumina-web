import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'lumina.db');

const APIFY_TOKEN = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

const DATASETS = {
  residentAdvisor: 'jGxsVlNDd54FJxAGl',
  keemeatsb: 'oQOl3qVCi8LspeOvh'
};

// ==========================================
// RESIDENT ADVISOR IMPORTER
// ==========================================
async function importResidentAdvisor() {
  console.log('\n🎵 === RESIDENT ADVISOR IMPORTER ===\n');
  
  const url = `https://api.apify.com/v2/datasets/${DATASETS.residentAdvisor}/items?token=${APIFY_TOKEN}`;
  
  console.log('📡 Fetching data...');
  const response = await fetch(url);
  const events = await response.json();
  
  console.log(`   Found ${events.length} events\n`);
  
  const db = new Database(DB_PATH);
  let saved = 0;
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events (
      name, venue_name, date, time, description, 
      image_url, ticket_url, city, source_type, 
      music_genres, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  
  for (const event of events) {
    try {
      // Parse date
      let eventDate = null;
      if (event.date) {
        eventDate = event.date.split('T')[0]; // YYYY-MM-DD
      }
      
      // Parse time
      let eventTime = null;
      if (event.startTime) {
        const timeObj = new Date(event.startTime);
        eventTime = timeObj.toTimeString().split(' ')[0]; // HH:MM:SS
      }
      
      // Get venue name
      const venueName = event.venue?.name || 'TBA';
      
      // Get image
      const imageUrl = event.images?.[0]?.filename || null;
      
      // Get ticket URL
      const ticketUrl = `https://ra.co${event.contentUrl}`;
      
      // Extract artists for genres
      const artists = event.artists?.map(a => a.name).join(', ') || null;
      
      const result = stmt.run(
        event.title,
        venueName,
        eventDate,
        eventTime,
        event.content?.substring(0, 500), // First 500 chars
        imageUrl,
        ticketUrl,
        'New York',
        'resident_advisor',
        artists
      );
      
      if (result.changes > 0) {
        saved++;
        if (saved <= 10) {
          console.log(`   ✅ ${event.title}`);
        }
      }
      
    } catch (err) {
      console.error(`   ❌ Error: ${event.title}`, err.message);
    }
  }
  
  db.close();
  
  console.log(`\n📊 Resident Advisor: ${saved} new events saved\n`);
  return saved;
}

// ==========================================
// KEEMEATSB IMPORTER
// ==========================================
async function importKeemeatsB() {
  console.log('\n🎉 === KEEMEATSB IMPORTER ===\n');
  
  const url = `https://api.apify.com/v2/datasets/${DATASETS.keemeatsb}/items?token=${APIFY_TOKEN}`;
  
  console.log('📡 Fetching data...');
  const response = await fetch(url);
  const pages = await response.json();
  
  console.log(`   Found ${pages.length} pages\n`);
  
  const db = new Database(DB_PATH);
  let saved = 0;
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events (
      name, date, city, neighborhood, source_type, created_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  
  for (const page of pages) {
    try {
      const text = page.text || '';
      
      // Parse events from text
      // Format: "December 5: Event Name"
      const lines = text.split('\n');
      
      for (const line of lines) {
        // Match pattern: "December 5: Event Name" or "December 5-6: Event Name"
        const match = line.match(/^(December|January|February|March)\s+(\d+)(?:-(\d+))?\s*:\s*(.+)$/i);
        
        if (match) {
          const [, month, day, endDay, eventName] = match;
          
          // Skip if it's a section header
          if (eventName.match(/^(Brooklyn|Manhattan|Queens|New Jersey)$/i)) continue;
          
          // Determine city from previous section
          let city = 'New York';
          let neighborhood = null;
          
          const lineIndex = lines.indexOf(line);
          for (let i = lineIndex - 1; i >= 0; i--) {
            const prevLine = lines[i].trim();
            if (prevLine === 'Brooklyn') {
              neighborhood = 'Brooklyn';
              break;
            } else if (prevLine === 'Manhattan') {
              neighborhood = 'Manhattan';
              break;
            } else if (prevLine === 'Queens') {
              neighborhood = 'Queens';
              break;
            } else if (prevLine === 'New Jersey') {
              city = 'New Jersey';
              break;
            }
          }
          
          // Build date (2025-12-05)
          const monthNum = {
            'December': 12,
            'January': 1,
            'February': 2,
            'March': 3
          }[month];
          
          const year = monthNum === 1 || monthNum === 2 || monthNum === 3 ? 2026 : 2025;
          const eventDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const result = stmt.run(
            eventName.trim(),
            eventDate,
            city,
            neighborhood,
            'keemeatsb'
          );
          
          if (result.changes > 0) {
            saved++;
            if (saved <= 10) {
              console.log(`   ✅ ${eventName.trim()}`);
            }
          }
        }
      }
      
    } catch (err) {
      console.error(`   ❌ Error parsing page:`, err.message);
    }
  }
  
  db.close();
  
  console.log(`\n📊 KeemeatsB: ${saved} new events saved\n`);
  return saved;
}

// ==========================================
// MAIN
// ==========================================
async function main() {
  console.log('🚀 APIFY COMBINED IMPORTER\n');
  console.log(`📅 ${new Date().toLocaleString()}\n`);
  
  try {
    const ra = await importResidentAdvisor();
    const kb = await importKeemeatsB();
    
    console.log('\n✅ === IMPORT COMPLETE ===');
    console.log(`   Resident Advisor: ${ra} events`);
    console.log(`   KeemeatsB: ${kb} events`);
    console.log(`   TOTAL: ${ra + kb} new events\n`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

main();
