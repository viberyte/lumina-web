import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/lumina.db');
const db = new Database(dbPath);

function parseEventDate(dateStr) {
  if (!dateStr) return null;
  
  // Format 1: "Tue · 8:00 PM" or "Tue • 8:00 PM"
  const format1 = dateStr.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*[·•]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (format1) {
    return parseRelativeDay(format1[1], format1[2], format1[3], format1[4]);
  }
  
  // Format 2: "Today • 5:00 PM"
  const format2 = dateStr.match(/^Today\s*[·•]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (format2) {
    return parseToday(format2[1], format2[2], format2[3]);
  }
  
  // Format 3: "5:00 pmSaturday12.6.25RESERVATIONS"
  const format3 = dateStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(\d{1,2})\.(\d{1,2})\.(\d{2})/i);
  if (format3) {
    return parseVenueCalendarFormat(format3);
  }
  
  return null;
}

function parseToday(hour, minute, ampm) {
  const now = new Date();
  let hours = parseInt(hour);
  if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  
  now.setHours(hours, parseInt(minute), 0, 0);
  return now.toISOString();
}

function parseRelativeDay(dayName, hour, minute, ampm) {
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const targetDay = dayMap[dayName];
  
  let hours = parseInt(hour);
  if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil < 0) daysUntil += 7;
  
  const eventDate = new Date(now);
  eventDate.setDate(now.getDate() + daysUntil);
  eventDate.setHours(hours, parseInt(minute), 0, 0);
  
  return eventDate.toISOString();
}

function parseVenueCalendarFormat(match) {
  const [, hour, minute, ampm, , month, day, year] = match;
  
  let hours = parseInt(hour);
  if (ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12;
  if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
  
  const fullYear = 2000 + parseInt(year);
  const eventDate = new Date(fullYear, parseInt(month) - 1, parseInt(day), hours, parseInt(minute), 0, 0);
  
  return eventDate.toISOString();
}

async function normalizeAllDates() {
  console.log('Starting comprehensive date normalization...');
  
  const events = db.prepare(`
    SELECT id, name, date, event_date
    FROM events
    WHERE event_date IS NULL OR event_date = ''
  `).all();
  
  console.log(`Found ${events.length} events without normalized dates`);
  
  let updated = 0;
  let failed = 0;
  
  for (const event of events) {
    try {
      const normalizedDate = parseEventDate(event.date);
      
      if (normalizedDate) {
        db.prepare(`
          UPDATE events 
          SET event_date = ?, 
              start_datetime = ?
          WHERE id = ?
        `).run(normalizedDate, normalizedDate, event.id);
        
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`Updated ${updated}/${events.length} events...`);
        }
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error.message);
      failed++;
    }
  }
  
  console.log('\nDate normalization complete!');
  console.log(`Stats:`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Failed: ${failed}`);
  console.log(`   - Total: ${events.length}`);
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN event_date IS NOT NULL AND event_date != '' THEN 1 ELSE 0 END) as with_dates
    FROM events
  `).get();
  
  console.log('\nFinal Database Stats:');
  console.log(`   - Total events: ${stats.total}`);
  console.log(`   - With dates: ${stats.with_dates} (${(stats.with_dates/stats.total*100).toFixed(1)}%)`);
  
  db.close();
}

normalizeAllDates().catch(console.error);
