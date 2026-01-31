import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data/lumina.db');
const FALLBACK_DIR = path.join(process.cwd(), 'public/images/fallbacks');

// Create directory if it doesn't exist
fs.mkdirSync(FALLBACK_DIR, { recursive: true });

const FALLBACK_TEMPLATES = {
  dining: {
    gradient: ['#FF6B6B', '#FFE66D'],
    icon: '🍽️'
  },
  nightlife: {
    gradient: ['#A855F7', '#EC4899'],
    icon: '🎵'
  },
  default: {
    gradient: ['#6366F1', '#8B5CF6'],
    icon: '📍'
  }
};

class FallbackImageGenerator {
  constructor() {
    this.db = new Database(DB_PATH);
  }

  generateFallbackUrl(venue) {
    const category = venue.category || 'default';
    const template = FALLBACK_TEMPLATES[category] || FALLBACK_TEMPLATES.default;
    
    // Use a gradient placeholder service (like UI Avatars or similar)
    const name = encodeURIComponent(venue.name.substring(0, 2));
    const bg = template.gradient[0].replace('#', '');
    const color = 'ffffff';
    
    return `https://ui-avatars.com/api/?name=${name}&size=400&background=${bg}&color=${color}&bold=true&format=png`;
  }

  updateVenuesWithoutPhotos() {
    console.log('🔍 Finding venues without photos...');
    
    const venues = this.db.prepare(`
      SELECT id, name, category 
      FROM venues 
      WHERE (photo_url IS NULL OR photo_url = '') 
        AND (professional_photo_url IS NULL OR professional_photo_url = '')
    `).all();
    
    console.log(`Found ${venues.length} venues without photos`);
    
    const updateStmt = this.db.prepare(`
      UPDATE venues 
      SET photo_url = ? 
      WHERE id = ?
    `);
    
    let updated = 0;
    for (const venue of venues) {
      const fallbackUrl = this.generateFallbackUrl(venue);
      updateStmt.run(fallbackUrl, venue.id);
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`  Updated ${updated}/${venues.length}...`);
      }
    }
    
    console.log(`\n✅ Updated ${updated} venues with fallback images!`);
  }

  run() {
    console.log('🎨 FALLBACK IMAGE GENERATOR\n');
    this.updateVenuesWithoutPhotos();
    this.db.close();
  }
}

const generator = new FallbackImageGenerator();
generator.run();
