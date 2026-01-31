import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const DATASET_URL = 'https://api.apify.com/v2/datasets/IrfJwpt1rc44X63oA/items?token=apify_api_ScS2hZ9dHtd3snbk0LPnsbJEuv7Pdx3TkIgC';

async function importLateNightEats() {
  console.log('Fetching late-night eats dataset...');
  const response = await fetch(DATASET_URL);
  const items = await response.json();
  
  console.log(`Processing ${items.length} late-night spots...`);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS venue_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venue_id) REFERENCES venues(id),
      UNIQUE(venue_id, tag)
    )
  `);

  const getVenueByPlaceIdStmt = db.prepare(`
    SELECT id, name FROM venues WHERE google_place_id = ?
  `);

  const getVenueByNameStmt = db.prepare(`
    SELECT id, name FROM venues WHERE LOWER(name) = LOWER(?) AND city = ?
  `);

  const tagStmt = db.prepare(`
    INSERT OR IGNORE INTO venue_tags (venue_id, tag) VALUES (?, ?)
  `);

  let tagged = 0;
  let notFound = 0;

  for (const item of items) {
    try {
      const name = item.title || item.name;
      const placeId = item.placeId;
      const city = item.city || 'New York';

      if (!name) {
        notFound++;
        continue;
      }

      // Try matching by Google Place ID first
      let venue = placeId ? getVenueByPlaceIdStmt.get(placeId) : null;

      // If not found, try matching by name + city
      if (!venue) {
        venue = getVenueByNameStmt.get(name, city);
      }

      if (venue) {
        tagStmt.run(venue.id, 'late_night_eats');
        tagStmt.run(venue.id, 'after_the_club');
        tagged++;
        console.log(`✅ Tagged: ${venue.name}`);
      } else {
        console.log(`❌ Not found: ${name}`);
        notFound++;
      }

    } catch (err) {
      console.error(`Error processing ${item.title}: ${err.message}`);
      notFound++;
    }
  }

  console.log(`\n✅ Tagging complete!`);
  console.log(`Venues tagged: ${tagged}`);
  console.log(`Not found in database: ${notFound}`);

  // Show tagged venues
  const taggedVenues = db.prepare(`
    SELECT v.id, v.name, v.city, GROUP_CONCAT(vt.tag) as tags
    FROM venues v
    JOIN venue_tags vt ON v.id = vt.venue_id
    WHERE vt.tag IN ('late_night_eats', 'after_the_club')
    GROUP BY v.id
    LIMIT 10
  `).all();

  console.log(`\nSample tagged venues:`);
  taggedVenues.forEach(v => {
    console.log(`  ${v.name} (${v.city}) - Tags: ${v.tags}`);
  });

  db.close();
}

importLateNightEats().catch(err => {
  console.error('Import error:', err);
  db.close();
  process.exit(1);
});
