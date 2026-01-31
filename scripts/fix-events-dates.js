/**
 * FIX EVENTS DATES STRUCTURE
 * 
 * Problems:
 * 1. date field is "Sat, Nov 8" (no year, unparseable)
 * 2. No proper datetime fields for sorting
 * 3. No end_date for multi-day events
 * 
 * Solution:
 * Add proper datetime columns and parse existing dates
 */

import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

console.log('🗓️  FIXING EVENTS DATE STRUCTURE\n');

const db = new Database(dbPath);

// Add new columns
console.log('📋 Adding new date columns...');

const newColumns = [
  'event_date DATE',           // Proper date: 2025-11-08
  'event_datetime DATETIME',   // Full datetime: 2025-11-08 20:00:00
  'end_date DATE',            // For multi-day events
  'is_recurring BOOLEAN DEFAULT 0',
  'day_of_week TEXT',         // Monday, Tuesday, etc.
  'month TEXT',               // November, December
  'year INTEGER',             // 2025
  'is_past BOOLEAN DEFAULT 0'
];

newColumns.forEach(col => {
  try {
    db.prepare(`ALTER TABLE events ADD COLUMN ${col}`).run();
    console.log(`   ✅ Added: ${col.split(' ')[0]}`);
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      console.log(`   ⚠️  ${col.split(' ')[0]}: ${e.message}`);
    }
  }
});

console.log('\n📅 Parsing existing dates...\n');

const events = db.prepare('SELECT * FROM events').all();

const monthMap = {
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
  'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
};

const updateStmt = db.prepare(`
  UPDATE events 
  SET event_date = ?,
      event_datetime = ?,
      day_of_week = ?,
      month = ?,
      year = ?,
      is_past = ?
  WHERE id = ?
`);

let fixed = 0;
let failed = 0;

events.forEach(event => {
  try {
    if (!event.date) {
      failed++;
      return;
    }
    
    // Parse "Sat, Nov 8" or "November 8" or "Nov 8-10"
    const dateStr = event.date.toLowerCase();
    
    // Extract month and day
    let month = null;
    let day = null;
    let endDay = null;
    
    // Find month
    for (const [abbrev, monthNum] of Object.entries(monthMap)) {
      if (dateStr.includes(abbrev)) {
        month = monthNum;
        break;
      }
    }
    
    // Extract day number(s)
    const dayMatch = dateStr.match(/(\d+)(?:-(\d+))?/);
    if (dayMatch) {
      day = parseInt(dayMatch[1]);
      endDay = dayMatch[2] ? parseInt(dayMatch[2]) : null;
    }
    
    if (month === null || !day) {
      console.log(`   ⚠️  Could not parse: "${event.date}"`);
      failed++;
      return;
    }
    
    // Determine year (assume current or next year)
    const now = new Date();
    let year = now.getFullYear();
    
    // If event month is before current month, assume next year
    if (month < now.getMonth()) {
      year++;
    }
    
    // Create date
    const eventDate = new Date(year, month, day);
    
    // Format for SQL
    const sqlDate = eventDate.toISOString().split('T')[0]; // 2025-11-08
    const sqlDatetime = `${sqlDate} ${event.time || '20:00:00'}`; // Add time if available
    
    // Check if past
    const isPast = eventDate < now ? 1 : 0;
    
    // Get day of week and month name
    const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = eventDate.toLocaleDateString('en-US', { month: 'long' });
    
    updateStmt.run(
      sqlDate,
      sqlDatetime,
      dayOfWeek,
      monthName,
      year,
      isPast,
      event.id
    );
    
    console.log(`   ✅ ${event.name.substring(0, 40)}... → ${sqlDate}`);
    fixed++;
    
  } catch (error) {
    console.log(`   ❌ Error on "${event.name}": ${error.message}`);
    failed++;
  }
});

// Delete past events
const deleted = db.prepare('DELETE FROM events WHERE is_past = 1').run();

console.log('\n' + '='.repeat(70));
console.log('\n📊 SUMMARY:');
console.log(`   ✅ Fixed: ${fixed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   🗑️  Deleted past events: ${deleted.changes}`);

// Show upcoming events
console.log('\n📅 UPCOMING EVENTS (Next 10):');
const upcoming = db.prepare(`
  SELECT name, event_date, day_of_week, city
  FROM events
  WHERE event_date >= date('now')
  ORDER BY event_date ASC
  LIMIT 10
`).all();

upcoming.forEach((e, i) => {
  console.log(`   ${i+1}. ${e.name.substring(0, 50)}`);
  console.log(`      📍 ${e.city} | 📅 ${e.day_of_week}, ${e.event_date}\n`);
});

db.close();

console.log('✅ Events dates fixed!\n');
