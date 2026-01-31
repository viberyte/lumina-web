import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/lumina.db');
const db = new Database(dbPath);

function parseRelativeDate(dateStr) {
  if (!dateStr) return null;
  
  // Extract day and time from formats like "Tue · 8:00 PM"
  const match = dateStr.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*·?\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  
  if (!match) return null;
  
  const [, dayName, hour, minute, ampm] = match;
  
  // Convert to 24-hour format
  let hours = parseInt(hour);
  if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  
  // Map day names to numbers (0 = Sunday)
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const targetDay = dayMap[dayName];
  
  // Find next occurrence of this day
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil < 0) daysUntil += 7; // Next week
  
  const eventDate = new Date(now);
  eventDate.setDate(now.getDate() + daysUntil);
  eventDate.setHours(hours, parseInt(minute), 0, 0);
  
  return eventDate.toISOString();
}

async function normalizeEventDates() {
  console.log('🔧 Starting event date normalization...');
  
  // Get all events with relative dates
  const events = db.prepare(`
    SELECT id, name, date, event_date
    FROM events
    WHERE date LIKE '%PM%' OR date LIKE '%AM%' OR date LIKE '%·%'
  `).all();
  
  console.log(`📊 Found ${events.length} events with relative dates`);
  
  let updated = 0;
  let failed = 0;
  
  for (const event of events) {
    try {
      const normalizedDate = parseRelativeDate(event.date);
      
      if (normalizedDate) {
        db.prepare(`
          UPDATE events 
          SET event_date = ?, 
              start_datetime = ?
          WHERE id = ?
        `).run(normalizedDate, normalizedDate, event.id);
        
        updated++;
        
        if (updated % 50 === 0) {
          console.log(`✅ Updated ${updated}/${events.length} events...`);
        }
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Error processing event ${event.id}:`, error.message);
      failed++;
    }
  }
  
  console.log('\n✅ Date normalization complete!');
  console.log(`📊 Stats:`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Failed: ${failed}`);
  console.log(`   - Total: ${events.length}`);
  
  db.close();
}

normalizeEventDates().catch(console.error);
