import fs from 'fs';
import csv from 'csv-parser';
import Database from 'better-sqlite3';

const db = new Database('./lumina.db');

// Create venues table
db.exec(`CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY,
  name TEXT,
  url TEXT,
  category TEXT,
  happy_hour TEXT,
  events TEXT,
  extracted_text TEXT
)`);

const venues = [];

// Parse CSV and collect data
fs.createReadStream('./dataset_website-content-crawler_2025-11-11_05-30-52-397.csv')
  .pipe(csv())
  .on('data', (row) => {
    const text = row.text || '';
    const nameMatch = text.match(/^([^\n|]+)/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';
    
    const happyHourMatch = text.match(/happy hour[^•\n]*/i);
    const happyHour = happyHourMatch ? happyHourMatch[0] : null;
    
    venues.push({
      name,
      url: row.url,
      happy_hour: happyHour,
      text: text.substring(0, 500)
    });
  })
  .on('end', () => {
    // Insert all venues
    const insert = db.prepare('INSERT INTO venues (name, url, happy_hour, extracted_text) VALUES (?, ?, ?, ?)');
    for (const venue of venues) {
      insert.run(venue.name, venue.url, venue.happy_hour, venue.text);
    }
    console.log(`Imported ${venues.length} venues`);
    db.close();
  });
