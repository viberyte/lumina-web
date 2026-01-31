import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.join(__dirname, '../data/lumina.db'));

// Parse "Thursday4 Dec" format
function parseVenueDate(dateStr) {
  const match = dateStr.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
  if (!match) return null;
  
  const [, , day, month] = match;
  const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const eventDate = new Date(currentYear, monthMap[month], parseInt(day), 20, 0, 0);
  
  // If date is in the past, assume next year
  if (eventDate < now) {
    eventDate.setFullYear(currentYear + 1);
  }
  
  return eventDate.toISOString();
}

const events = db.prepare(`
  SELECT id, name, date 
  FROM events 
  WHERE (event_date IS NULL OR event_date = '')
  AND date IS NOT NULL
`).all();

console.log(`Found ${events.length} events to fix`);

let updated = 0;
for (const event of events) {
  const parsed = parseVenueDate(event.date);
  if (parsed) {
    db.prepare('UPDATE events SET event_date = ?, start_datetime = ? WHERE id = ?')
      .run(parsed, parsed, event.id);
    updated++;
  }
}

console.log(`Updated ${updated} events`);

const final = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN event_date IS NOT NULL AND event_date != '' THEN 1 ELSE 0 END) as with_dates
  FROM events
`).get();

console.log(`Final: ${final.with_dates}/${final.total} events have dates (${(final.with_dates/final.total*100).toFixed(1)}%)`);

db.close();
