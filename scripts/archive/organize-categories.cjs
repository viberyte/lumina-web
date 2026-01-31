const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('🏷️ Organizing venue categories...\n');

// DINING - restaurants, food spots
const diningResult = db.prepare(`
  UPDATE venues SET category = 'dining'
  WHERE category IN (
    'Restaurant / Dining', 'dining/brunch', 'Breakfast & Brunch', 
    'breakfast-brunch', 'casual', 'takeout', 'catering',
    'food_delivery_services', 'Pop-Up Restaurants', 'bakeries'
  ) AND should_exclude = 0
`).run();
console.log(`✅ Dining: ${diningResult.changes} venues updated`);

// NIGHTLIFE - clubs, bars, party spots
const nightlifeResult = db.prepare(`
  UPDATE venues SET category = 'nightlife'
  WHERE category IN (
    'Nightclub', 'Bar', 'Bars', 'dance_clubs', 'music', 
    'music_venues', 'sports-bars', 'sports_bars', 'sports bars',
    'performing_arts', 'festivals'
  ) AND should_exclude = 0
`).run();
console.log(`✅ Nightlife: ${nightlifeResult.changes} venues updated`);

// LOUNGE - upscale lounges, cocktail bars, speakeasies
const loungeResult = db.prepare(`
  UPDATE venues SET category = 'lounge'
  WHERE category IN (
    'Lounge', 'Speakeasy', 'Rooftop', 'dining/lounges',
    'Airport Lounges', 'dining/nightlife/lounge', 'dining|nightlife|lounge'
  ) AND should_exclude = 0
`).run();
console.log(`✅ Lounge: ${loungeResult.changes} venues updated`);

// CAFE - coffee shops, daytime spots
const cafeResult = db.prepare(`
  UPDATE venues SET category = 'cafe'
  WHERE category IN (
    'cafe', 'cafes', 'Cafes', 'cafeteria', 'dining/cafes',
    'Coffee & Tea'
  ) AND should_exclude = 0
`).run();
console.log(`✅ Cafe: ${cafeResult.changes} venues updated`);

// FOOD TRUCK - mobile food
const foodTruckResult = db.prepare(`
  UPDATE venues SET category = 'food_truck'
  WHERE category IN (
    'food_trucks', 'Food Trucks', 'food-trucks', 'food-truck', 'food_stands'
  ) AND should_exclude = 0
`).run();
console.log(`✅ Food Truck: ${foodTruckResult.changes} venues updated`);

// FAST CASUAL
const fastCasualResult = db.prepare(`
  UPDATE venues SET category = 'fast_casual'
  WHERE category IN ('fast-food', 'fast-casual') AND should_exclude = 0
`).run();
console.log(`✅ Fast Casual: ${fastCasualResult.changes} venues updated`);

// EVENT VENUE
const eventResult = db.prepare(`
  UPDATE venues SET category = 'event_venue'
  WHERE category = 'venue' AND should_exclude = 0
`).run();
console.log(`✅ Event Venue: ${eventResult.changes} venues updated`);

// DINING/NIGHTLIFE combo - keep as is but clean up format
const comboResult = db.prepare(`
  UPDATE venues SET category = 'dining_nightlife'
  WHERE category = 'dining/nightlife' AND should_exclude = 0
`).run();
console.log(`✅ Dining/Nightlife: ${comboResult.changes} venues updated`);

// Show final breakdown
console.log('\n📊 Final category breakdown:');
const counts = db.prepare(`
  SELECT category, COUNT(*) as count 
  FROM venues 
  WHERE should_exclude = 0
  GROUP BY category
  ORDER BY count DESC
`).all();

counts.forEach(c => {
  console.log(`   ${c.category}: ${c.count}`);
});

const total = db.prepare(`SELECT COUNT(*) as count FROM venues WHERE should_exclude = 0`).get();
console.log(`\n📊 Total active venues: ${total.count}`);

db.close();
console.log('\n✅ Done!');
