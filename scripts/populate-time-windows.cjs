const Database = require('better-sqlite3');
const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

const dayMap = {
  'sunday': 'sun', 'monday': 'mon', 'tuesday': 'tue', 'wednesday': 'wed',
  'thursday': 'thu', 'friday': 'fri', 'saturday': 'sat'
};

function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3]?.toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return { hours, minutes, total: hours * 60 + minutes };
}

function formatTime(hours, minutes = 0) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateWindows(openTime, closeTime, category, energyLevel) {
  if (!openTime || !closeTime) return null;
  
  const open = parseTime(openTime);
  const close = parseTime(closeTime);
  if (!open || !close) return null;
  
  // Handle after-midnight closes
  let closeHours = close.hours;
  if (closeHours < open.hours) closeHours += 24;
  
  const duration = closeHours - open.hours;
  if (duration < 2) return null;
  
  // Calculate windows based on category and energy
  const isClub = ['nightclub', 'club'].includes(category?.toLowerCase());
  const isBar = ['bar', 'lounge', 'rooftop'].includes(category?.toLowerCase());
  const isRestaurant = ['restaurant', 'cafe', 'diner'].includes(category?.toLowerCase());
  const isHighEnergy = ['high', 'energetic', 'lively'].includes(energyLevel?.toLowerCase());
  
  let bestArrival, peakStart, peakEnd, lateStart, lateEnd;
  
  if (isClub) {
    bestArrival = formatTime(22, 30);
    peakStart = formatTime(23, 30);
    peakEnd = formatTime(1, 30);
    lateStart = formatTime(1, 30);
    lateEnd = closeHours > 24 ? formatTime(closeHours - 24) : formatTime(closeHours);
  } else if (isBar && isHighEnergy) {
    bestArrival = formatTime(21, 0);
    peakStart = formatTime(22, 30);
    peakEnd = formatTime(0, 30);
    lateStart = formatTime(0, 30);
    lateEnd = closeHours > 24 ? formatTime(closeHours - 24) : formatTime(closeHours);
  } else if (isBar) {
    bestArrival = formatTime(20, 0);
    peakStart = formatTime(21, 30);
    peakEnd = formatTime(23, 30);
    lateStart = formatTime(23, 30);
    lateEnd = closeHours > 24 ? formatTime(closeHours - 24) : formatTime(closeHours);
  } else if (isRestaurant) {
    bestArrival = formatTime(19, 0);
    peakStart = formatTime(19, 30);
    peakEnd = formatTime(21, 0);
    lateStart = null;
    lateEnd = null;
  } else {
    // Default
    const midpoint = open.hours + Math.floor(duration / 2);
    bestArrival = formatTime(open.hours + 1);
    peakStart = formatTime(midpoint);
    peakEnd = formatTime(midpoint + 2);
    lateStart = null;
    lateEnd = null;
  }
  
  return { bestArrival, peakStart, peakEnd, lateStart, lateEnd };
}

// Get venues with hours
const venues = db.prepare(`
  SELECT id, name, category, energy_level, hours_json 
  FROM venues 
  WHERE hours_json IS NOT NULL 
    AND hours_json != '' 
    AND hours_json != '{}'
`).all();

console.log(`Processing ${venues.length} venues...`);

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO venue_time_windows 
  (venue_id, day_of_week, best_arrival, peak_start, peak_end, late_start, late_end, confidence)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let processed = 0;
let inserted = 0;

for (const venue of venues) {
  try {
    let hours = venue.hours_json;
    if (typeof hours === 'string') {
      hours = JSON.parse(hours);
    }
    
    // Handle array format: ["Monday: 8:00 AM – 9:00 PM", ...]
    if (Array.isArray(hours)) {
      for (const entry of hours) {
        const match = entry.match(/^(\w+):\s*(.+?)\s*[–-]\s*(.+)$/i);
        if (!match) continue;
        
        const dayName = match[1].toLowerCase();
        const dow = dayMap[dayName];
        if (!dow) continue;
        
        const openTime = match[2].trim();
        const closeTime = match[3].trim();
        
        const windows = calculateWindows(openTime, closeTime, venue.category, venue.energy_level);
        if (windows) {
          insertStmt.run(
            venue.id, dow,
            windows.bestArrival, windows.peakStart, windows.peakEnd,
            windows.lateStart, windows.lateEnd,
            0.7
          );
          inserted++;
        }
      }
    }
    // Handle object format: { "monday": { "open": "...", "close": "..." }, ... }
    else if (typeof hours === 'object') {
      for (const [dayName, times] of Object.entries(hours)) {
        const dow = dayMap[dayName.toLowerCase()];
        if (!dow || !times) continue;
        
        const openTime = times.open || times.start;
        const closeTime = times.close || times.end;
        
        const windows = calculateWindows(openTime, closeTime, venue.category, venue.energy_level);
        if (windows) {
          insertStmt.run(
            venue.id, dow,
            windows.bestArrival, windows.peakStart, windows.peakEnd,
            windows.lateStart, windows.lateEnd,
            0.7
          );
          inserted++;
        }
      }
    }
    
    processed++;
  } catch (e) {
    // Skip venues with unparseable hours
  }
}

console.log(`\n✅ Processed ${processed} venues`);
console.log(`✅ Inserted ${inserted} time window records`);

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
