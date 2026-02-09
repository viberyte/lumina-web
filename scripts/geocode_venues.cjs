const Database = require('better-sqlite3');
const axios = require('axios');

const GOOGLE_API_KEY = 'AIzaSyBhkMDEoKgSGF96C4PBtsW3BpBMGGVJfpU';
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('VENUE GEOCODER\n');

// Get venues missing coordinates but have address
const venues = db.prepare(`
  SELECT id, name, address, city, state 
  FROM venues 
  WHERE (latitude IS NULL OR longitude IS NULL)
  AND address IS NOT NULL 
  AND address != '' 
  AND address != 'Address not found'
`).all();

console.log(`Venues to geocode: ${venues.length}\n`);

const updateStmt = db.prepare(`
  UPDATE venues SET latitude = ?, longitude = ?, updated_at = datetime('now')
  WHERE id = ?
`);

let success = 0;
let failed = 0;

async function geocode(venue) {
  const address = `${venue.address}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
  
  try {
    const res = await axios.get(url, { timeout: 10000 });
    
    if (res.data.status === 'OK' && res.data.results.length > 0) {
      const loc = res.data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function run() {
  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    const label = `[${i + 1}/${venues.length}] ${v.name.slice(0, 35).padEnd(35)}`;
    
    process.stdout.write(`${label} `);
    
    const coords = await geocode(v);
    
    if (coords) {
      updateStmt.run(coords.lat, coords.lng, v.id);
      success++;
      console.log(`✅ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    } else {
      failed++;
      console.log(`❌ not found`);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  GEOCODING COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
