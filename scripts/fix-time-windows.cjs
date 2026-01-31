const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

function militaryToStandard(time) {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// Get all time windows
const windows = db.prepare(`SELECT id, best_arrival, peak_start, peak_end, late_start, late_end FROM venue_time_windows`).all();

console.log(`Converting ${windows.length} time window records to standard time...`);

const updateStmt = db.prepare(`
  UPDATE venue_time_windows 
  SET best_arrival = ?, peak_start = ?, peak_end = ?, late_start = ?, late_end = ?
  WHERE id = ?
`);

for (const w of windows) {
  updateStmt.run(
    militaryToStandard(w.best_arrival),
    militaryToStandard(w.peak_start),
    militaryToStandard(w.peak_end),
    militaryToStandard(w.late_start),
    militaryToStandard(w.late_end),
    w.id
  );
}

console.log('✅ Converted to standard time');

// Show sample
const sample = db.prepare(`
  SELECT v.name, t.day_of_week, t.best_arrival, t.peak_start, t.peak_end 
  FROM venue_time_windows t 
  JOIN venues v ON v.id = t.venue_id 
  LIMIT 5
`).all();

console.log('\nSample records:');
console.table(sample);

db.close();
