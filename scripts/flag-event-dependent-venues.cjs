const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Add the column if it doesn't exist
try {
  db.exec(`ALTER TABLE venues ADD COLUMN event_dependent INTEGER DEFAULT 0`);
  console.log('Added event_dependent column');
} catch (e) {
  console.log('Column already exists');
}

// Patterns that indicate event-dependent venues
const eventVenuePatterns = [
  // Explicit venue types
  'concert hall', 'music hall', 'event space', 'event venue',
  'theater', 'theatre', 'amphitheater', 'arena', 'stadium',
  'performance venue', 'live venue', 'music venue',
  // Known NYC event venues (add more as needed)
];

const eventVenueNames = [
  'webster hall', 'sony hall', 'market hotel', 'terminal 5',
  'irving plaza', 'brooklyn steel', 'avant gardner', 'mirage',
  'the brooklyn monarch', 'knockdown center', 'elsewhere',
  'baby\'s all right', 'rough trade', 'music hall of williamsburg',
  'warsaw', 'le poisson rouge', 'bowery ballroom', 'mercury lounge',
  'gramercy theatre', 'beacon theatre', 'radio city', 'msg',
  'madison square garden', 'barclays center', 'forest hills stadium',
  'kings theatre', 'st. ann\'s warehouse', 'brooklyn academy of music',
  'bam', 'town hall', 'hammerstein ballroom', 'the rooftop at pier 17',
  'brooklyn mirage', 'the hall at elsewhere', 'sultan room',
  'good room', 'nowadays', 'house of yes', 'public records',
  'jupiter disco', 'basement', 'bossa nova civic club',
  'wonderville', 'trans-pecos', 'tv eye', 'saint vitus',
  'the meadows', 'the well', 'the dance', 'paragon'
];

// Flag by name match
let flaggedByName = 0;
for (const name of eventVenueNames) {
  const result = db.prepare(`
    UPDATE venues 
    SET event_dependent = 1 
    WHERE LOWER(name) LIKE ? 
      AND event_dependent = 0
  `).run(`%${name}%`);
  flaggedByName += result.changes;
}

console.log(`Flagged ${flaggedByName} venues by name match`);

// Flag by category
const result2 = db.prepare(`
  UPDATE venues 
  SET event_dependent = 1 
  WHERE (
    LOWER(category) LIKE '%concert%'
    OR LOWER(category) LIKE '%music venue%'
    OR LOWER(category) LIKE '%event space%'
    OR LOWER(category) LIKE '%theater%'
    OR LOWER(category) LIKE '%theatre%'
    OR LOWER(category) LIKE '%performance%'
  )
  AND event_dependent = 0
`).run();

console.log(`Flagged ${result2.changes} venues by category`);

// Flag by amenities (has "live music" or "concerts" as primary feature)
const result3 = db.prepare(`
  UPDATE venues 
  SET event_dependent = 1 
  WHERE (
    LOWER(amenities) LIKE '%concert%'
    OR LOWER(primary_purpose) = 'concerts'
    OR LOWER(experience_type) LIKE '%concert%'
    OR LOWER(experience_type) LIKE '%live music%'
  )
  AND event_dependent = 0
  AND category NOT IN ('bar', 'lounge', 'restaurant')
`).run();

console.log(`Flagged ${result3.changes} venues by amenities/purpose`);

// Show all flagged venues
const flagged = db.prepare(`
  SELECT id, name, category 
  FROM venues 
  WHERE event_dependent = 1
  ORDER BY name
`).all();

console.log(`\n✅ Total event-dependent venues: ${flagged.length}`);
console.log('\nEvent-dependent venues:');
console.table(flagged.slice(0, 30));

if (flagged.length > 30) {
  console.log(`... and ${flagged.length - 30} more`);
}

db.close();
