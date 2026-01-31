const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'lumina.db'));

console.log('Setting up complete chat room structure...\n');

// Define all cities and boroughs
const NYC_BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens'];
const OTHER_CITIES = ['Philadelphia', 'North Jersey', 'South Jersey', 'Washington DC'];

// Universal vibe structure
const NIGHTLIFE_VIBES = [
  { name: 'Hip-Hop / R&B', slug_suffix: 'hip-hop-rnb', emoji: '🎤', description: 'Hip-hop and R&B scenes', sort: 1 },
  { name: 'House / Techno', slug_suffix: 'house-techno', emoji: '🎧', description: 'House and techno nights', sort: 2 },
  { name: 'Afrobeats / Amapiano', slug_suffix: 'afrobeats-amapiano', emoji: '🌍', description: 'Afrobeats and Amapiano parties', sort: 3 },
  { name: 'Latin', slug_suffix: 'latin', emoji: '💃', description: 'Latin music and culture', sort: 4 },
  { name: 'EDM / Festival', slug_suffix: 'edm-festival', emoji: '⚡', description: 'EDM and festival vibes', sort: 5 },
  { name: 'Jazz / Live Music', slug_suffix: 'jazz-live', emoji: '🎷', description: 'Jazz and live performances', sort: 6 },
  { name: 'Lounge / Rooftop', slug_suffix: 'lounge-rooftop', emoji: '🍸', description: 'Upscale lounges and rooftops', sort: 7 },
];

const FOOD_VIBES = [
  { name: 'Date Night Dining', slug_suffix: 'date-night', emoji: '🍽️', description: 'Romantic dining spots', sort: 8 },
  { name: 'Foodie Experiences', slug_suffix: 'foodie-experiences', emoji: '👨‍🍳', description: 'Chef-driven experiences', sort: 9 },
  { name: 'Casual & Social', slug_suffix: 'casual-social', emoji: '🍕', description: 'Casual group dining', sort: 10 },
  { name: 'Late Night Eats', slug_suffix: 'late-night', emoji: '🌙', description: 'Open late night', sort: 11 },
  { name: 'Cultural Dining', slug_suffix: 'cultural-dining', emoji: '🥘', description: 'Authentic cultural cuisine', sort: 12 },
  { name: 'Quick & Solo', slug_suffix: 'quick-solo', emoji: '☕', description: 'Quick bites and solo-friendly', sort: 13 },
];

const SPONTANEOUS = { name: 'Spontaneous / Anything', slug_suffix: 'spontaneous', emoji: '🎲', description: 'Open to anything', sort: 14 };

// Clear existing rooms
db.prepare('DELETE FROM chat_rooms').run();
console.log('Cleared existing rooms\n');

let totalRooms = 0;

// Function to add vibes for a city
function addVibesForCity(cityName, parentRoomId) {
  const citySlug = cityName.toLowerCase().replace(/ /g, '-');
  let count = 0;
  
  // Add nightlife vibes
  NIGHTLIFE_VIBES.forEach(vibe => {
    const slug = `${citySlug}-${vibe.slug_suffix}`;
    db.prepare(`
      INSERT INTO chat_rooms (name, slug, city, room_type, category, emoji, description, parent_room_id, sort_order)
      VALUES (?, ?, ?, 'vibe', 'nightlife', ?, ?, ?, ?)
    `).run(vibe.name, slug, cityName, vibe.emoji, vibe.description, parentRoomId, vibe.sort);
    count++;
  });
  
  // Add food vibes
  FOOD_VIBES.forEach(vibe => {
    const slug = `${citySlug}-${vibe.slug_suffix}`;
    db.prepare(`
      INSERT INTO chat_rooms (name, slug, city, room_type, category, emoji, description, parent_room_id, sort_order)
      VALUES (?, ?, ?, 'vibe', 'food', ?, ?, ?, ?)
    `).run(vibe.name, slug, cityName, vibe.emoji, vibe.description, parentRoomId, vibe.sort);
    count++;
  });
  
  // Add spontaneous vibe
  const slug = `${citySlug}-${SPONTANEOUS.slug_suffix}`;
  db.prepare(`
    INSERT INTO chat_rooms (name, slug, city, room_type, category, emoji, description, parent_room_id, sort_order)
    VALUES (?, ?, ?, 'vibe', 'flex', ?, ?, ?, ?)
  `).run(SPONTANEOUS.name, slug, cityName, SPONTANEOUS.emoji, SPONTANEOUS.description, parentRoomId, SPONTANEOUS.sort);
  count++;
  
  return count;
}

// Add NYC boroughs
console.log('Adding NYC boroughs...');
NYC_BOROUGHS.forEach(borough => {
  const slug = borough.toLowerCase().replace(/ /g, '-');
  const result = db.prepare(`
    INSERT INTO chat_rooms (name, slug, city, borough, room_type, emoji, description, sort_order)
    VALUES (?, ?, ?, ?, 'borough', '📍', ?, 0)
  `).run(borough, slug, borough, borough, `${borough} borough`);
  
  const parentId = result.lastInsertRowid;
  const vibeCount = addVibesForCity(borough, parentId);
  console.log(`  ${borough}: 1 main + ${vibeCount} vibes = ${vibeCount + 1} rooms`);
  totalRooms += vibeCount + 1;
});

console.log('\nAdding other cities...');
OTHER_CITIES.forEach(city => {
  const slug = city.toLowerCase().replace(/ /g, '-');
  const result = db.prepare(`
    INSERT INTO chat_rooms (name, slug, city, room_type, emoji, description, sort_order)
    VALUES (?, ?, ?, 'city', '📍', ?, 0)
  `).run(city, slug, city, `${city} city hub`);
  
  const parentId = result.lastInsertRowid;
  const vibeCount = addVibesForCity(city, parentId);
  console.log(`  ${city}: 1 main + ${vibeCount} vibes = ${vibeCount + 1} rooms`);
  totalRooms += vibeCount + 1;
});

console.log(`\n✅ Created ${totalRooms} total rooms`);

// Show summary
const summary = db.prepare(`
  SELECT city, category, COUNT(*) as count 
  FROM chat_rooms 
  WHERE room_type = 'vibe'
  GROUP BY city, category
  ORDER BY city, category
`).all();

console.log('\n📊 Summary by city and category:');
summary.forEach(row => {
  console.log(`  ${row.city} - ${row.category}: ${row.count} vibes`);
});

db.close();
console.log('\n✅ Setup complete!');
