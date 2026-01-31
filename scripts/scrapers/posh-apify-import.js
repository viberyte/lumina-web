import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

async function importPosh() {
  console.log('💎 POSH APIFY IMPORT\n');
  
  const url = 'https://api.apify.com/v2/datasets/DnglL4nxgKYQbHfKI/items?token=apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';
  const response = await fetch(url);
  const events = await response.json();
  
  console.log('Found', events.length, 'POSH events\n');
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events 
    (name, venue_name, date, event_date, time, description, ticket_url, image_url, city, source_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'posh', datetime('now'))
  `);
  
  // NYC area filter
  const nycAreas = ['new york', 'brooklyn', 'manhattan', 'queens', 'bronx', 'staten island', 'jersey city', 'hoboken', 'ny'];
  
  let added = 0;
  let skipped = 0;
  
  for (const e of events) {
    const city = (e.city || '').toLowerCase();
    const state = (e.stateCode || '').toLowerCase();
    
    // Only NYC area
    const isNYC = nycAreas.some(a => city.includes(a)) || state === 'ny' || state === 'nj';
    if (!isNYC) {
      skipped++;
      continue;
    }
    
    try {
      const eventDate = e.startDateTime ? new Date(e.startDateTime).toISOString().split('T')[0] : null;
      const eventTime = e.startDateTime ? new Date(e.startDateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;
      
      const result = stmt.run(
        e.eventTitle,
        e.venueName || e.venue?.name,
        eventDate,
        eventDate,
        eventTime,
        (e.description || '').substring(0, 500),
        e.eventUrl,
        e.coverUrl,
        e.city || 'New York'
      );
      
      if (result.changes > 0) {
        added++;
        console.log('✅', e.eventTitle);
      }
    } catch (err) {
      console.log('❌', err.message);
    }
  }
  
  console.log('\n⏭️  Skipped', skipped, 'non-NYC events');
  console.log('💾 Added', added, 'new POSH NYC events');
  
  const total = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_date >= date('now')").get();
  console.log('📊 Total upcoming events:', total.count);
  
  db.close();
}

importPosh();
