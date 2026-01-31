import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.join(__dirname, '../data/lumina.db'));

// Map of variations to standard genres
const genreMap = {
  // Afrobeats variations
  'afrobeat': 'Afrobeats',
  'afrobeats': 'Afrobeats',
  'afro': 'Afrobeats',
  'afro beat': 'Afrobeats',
  
  // Hip-Hop variations
  'hip-hop': 'Hip-Hop',
  'hiphop': 'Hip-Hop',
  'hip hop': 'Hip-Hop',
  'rap': 'Hip-Hop',
  
  // Latin variations
  'latin': 'Latin',
  'reggaeton': 'Latin',
  'bachata': 'Latin',
  'salsa': 'Latin',
  
  // House/EDM variations
  'house': 'House',
  'tech house': 'House',
  'deep house': 'House',
  'edm': 'EDM',
  'electronic': 'EDM',
  'techno': 'EDM',
  
  // R&B variations
  'r&b': 'R&B',
  'rnb': 'R&B',
  'soul': 'R&B',
  
  // Reggae
  'reggae': 'Reggae',
  'dancehall': 'Reggae',
  
  // Live Music
  'live': 'Live Music',
  'live music': 'Live Music',
  'jazz': 'Jazz',
  'rock': 'Rock',
  'pop': 'Pop',
};

function standardizeGenre(genre) {
  if (!genre) return null;
  const lower = genre.toLowerCase().trim();
  return genreMap[lower] || null;
}

function extractGenresFromText(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const genres = [];
  
  if (lower.includes('afrobeat')) genres.push('Afrobeats');
  if (lower.includes('hip-hop') || lower.includes('hiphop') || lower.includes('rap')) genres.push('Hip-Hop');
  if (lower.includes('latin') || lower.includes('reggaeton') || lower.includes('bachata')) genres.push('Latin');
  if (lower.includes('house') || lower.includes('edm') || lower.includes('techno')) genres.push('House');
  if (lower.includes('r&b') || lower.includes('rnb') || lower.includes('soul')) genres.push('R&B');
  if (lower.includes('reggae') || lower.includes('dancehall')) genres.push('Reggae');
  if (lower.includes('jazz')) genres.push('Jazz');
  if (lower.includes('live music')) genres.push('Live Music');
  
  return [...new Set(genres)]; // Remove duplicates
}

console.log('Starting genre standardization...');

const events = db.prepare('SELECT id, name, description, music_genre, music_genres FROM events').all();

let updated = 0;
let standardized = 0;
let extracted = 0;

for (const event of events) {
  let finalGenres = [];
  
  // Try to standardize existing genre
  if (event.music_genre) {
    const standardGenre = standardizeGenre(event.music_genre);
    if (standardGenre) {
      finalGenres.push(standardGenre);
      standardized++;
    }
  }
  
  // If no valid genre, try to extract from name/description
  if (finalGenres.length === 0) {
    const extractedGenres = extractGenresFromText(event.name + ' ' + event.description);
    if (extractedGenres.length > 0) {
      finalGenres = extractedGenres;
      extracted++;
    }
  }
  
  // Update if we found genres
  if (finalGenres.length > 0) {
    const genresJson = JSON.stringify(finalGenres);
    db.prepare('UPDATE events SET music_genres = ?, music_genre = ? WHERE id = ?')
      .run(genresJson, finalGenres[0], event.id);
    updated++;
  }
  
  if (updated % 500 === 0) {
    console.log(`Processed ${updated} events...`);
  }
}

console.log(`\nGenre standardization complete!`);
console.log(`  - Events updated: ${updated}`);
console.log(`  - Standardized existing: ${standardized}`);
console.log(`  - Extracted from text: ${extracted}`);

// Show final genre distribution
const genreStats = db.prepare(`
  SELECT music_genre, COUNT(*) as count 
  FROM events 
  WHERE music_genre IS NOT NULL 
  GROUP BY music_genre 
  ORDER BY count DESC
`).all();

console.log(`\nFinal genre distribution:`);
genreStats.forEach(stat => {
  console.log(`  ${stat.music_genre}: ${stat.count}`);
});

db.close();
