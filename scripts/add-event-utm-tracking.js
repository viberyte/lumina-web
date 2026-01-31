/**
 * ADD UTM TRACKING TO EVENT LINKS
 */

import Database from 'better-sqlite3';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('🔗 ADDING UTM TRACKING TO EVENT LINKS\n');

const events = db.prepare(`
  SELECT id, name, ticket_url, music_genre 
  FROM events 
  WHERE ticket_url IS NOT NULL 
    AND ticket_url != ''
`).all();

console.log(`Found ${events.length} events with ticket links\n`);

const updateStmt = db.prepare(`
  UPDATE events 
  SET ticket_url = ? 
  WHERE id = ?
`);

let updated = 0;

events.forEach(event => {
  try {
    const url = new URL(event.ticket_url);
    
    url.searchParams.set('utm_source', 'viberyte');
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', 'event_booking');
    url.searchParams.set('utm_content', event.name.slice(0, 50));
    
    const trackedLink = url.toString();
    
    updateStmt.run(trackedLink, event.id);
    updated++;
    
    if (updated % 50 === 0) {
      console.log(`✅ Updated ${updated} events...`);
    }
  } catch (err) {
    console.log(`⚠️  Skipped ${event.name}: Invalid URL`);
  }
});

console.log(`\n✅ Added UTM tracking to ${updated} events\n`);

db.close();
