const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Count before
const before = db.prepare(`SELECT COUNT(*) as count FROM venue_transitions`).get();
console.log(`Transitions before: ${before.count}`);

// Delete transitions where the destination is event-dependent
const result = db.prepare(`
  DELETE FROM venue_transitions 
  WHERE to_venue_id IN (
    SELECT id FROM venues WHERE event_dependent = 1
  )
`).run();

console.log(`Removed ${result.changes} transitions to event-dependent venues`);

// Count after
const after = db.prepare(`SELECT COUNT(*) as count FROM venue_transitions`).get();
console.log(`Transitions after: ${after.count}`);

// Verify no event-dependent venues in destinations
const check = db.prepare(`
  SELECT COUNT(*) as count
  FROM venue_transitions vt
  JOIN venues v ON v.id = vt.to_venue_id
  WHERE v.event_dependent = 1
`).get();

console.log(`\n✅ Event-dependent venues in transitions: ${check.count} (should be 0)`);

db.close();
