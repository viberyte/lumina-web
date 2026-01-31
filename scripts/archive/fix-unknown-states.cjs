const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// City to State mapping
const cityToState = {
  // Maryland
  'Baltimore': 'MD',
  'Dundalk': 'MD',
  
  // New York
  'New York': 'NY',
  'New York City': 'NY',
  'Manhattan': 'NY',
  'Brooklyn': 'NY',
  'Queens': 'NY',
  'Bronx': 'NY',
  'The Bronx': 'NY',
  'Staten Island': 'NY',
  'Astoria': 'NY',
  'Bushwick': 'NY',
  'Williamsburg': 'NY',
  'Flushing': 'NY',
  'Long Island City': 'NY',
  'Jackson Heights': 'NY',
  'East Village': 'NY',
  'NoHo': 'NY',
  'NoMAD': 'NY',
  'SoHo': 'NY',
  'Koreatown': 'NY',
  'Harlem': 'NY',
  'East Meadow': 'NY',
  'Hicksville': 'NY',
  'Long Island': 'NY',
  'Westbury': 'NY',
  'Selden': 'NY',
  'East Hampton': 'NY',
  'Neversink': 'NY',
  'Upstate New York': 'NY',
  'Elmhurst': 'NY',
  'Marlboro': 'NY',
  
  // Virginia
  'Norfolk': 'VA',
  'Virginia Beach': 'VA',
  'Richmond': 'VA',
  'Arlington': 'VA',
  'Alexandria': 'VA',
  'Chesapeake': 'VA',
  'Newport News': 'VA',
  'Hampton': 'VA',
  
  // Pennsylvania
  'Philadelphia': 'PA',
  'Phila': 'PA',
  'Brewerytown': 'PA',
  'Upper Darby': 'PA',
  'West Chester': 'PA',
  
  // Washington DC
  'Washington': 'DC',
  'Washington, DC': 'DC',
  'Washington DC': 'DC',
  'Washington D.C.': 'DC',
  'Washington Dc': 'DC',
  'Washington, D.C.': 'DC',
};

console.log('='.repeat(60));
console.log('FIXING UNKNOWN STATES');
console.log('='.repeat(60));

let totalFixed = 0;

Object.entries(cityToState).forEach(([city, state]) => {
  const result = db.prepare(`
    UPDATE venues 
    SET state = ? 
    WHERE city = ? AND (state IS NULL OR state = '' OR state = 'UNKNOWN')
  `).run(state, city);
  
  if (result.changes > 0) {
    console.log(`✅ ${city} → ${state}: ${result.changes} venues fixed`);
    totalFixed += result.changes;
  }
});

// Also fix venues where state is NULL but city exists in our mapping
const nullStateVenues = db.prepare(`
  SELECT DISTINCT city, COUNT(*) as count 
  FROM venues 
  WHERE state IS NULL OR state = '' 
  GROUP BY city 
  ORDER BY count DESC
`).all();

console.log('\n' + '='.repeat(60));
console.log('REMAINING VENUES WITH NO STATE:');
console.log('='.repeat(60));
nullStateVenues.slice(0, 30).forEach(v => {
  console.log(`  ${v.city}: ${v.count} venues`);
});

console.log('\n' + '='.repeat(60));
console.log(`TOTAL FIXED: ${totalFixed} venues`);
console.log('='.repeat(60));

db.close();
