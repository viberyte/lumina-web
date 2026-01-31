import fs from 'fs';
import path from 'path';

const cities = [
  { name: 'NYC/NJ', file: '../nyc_region/nyc_region_with_tiktok.json' },
  { name: 'DC', file: './dc/super_enriched_dc.json' },
  { name: 'Philly', file: './philly/super_enriched_philly.json' },
  { name: 'Baltimore', file: './baltimore/super_enriched_baltimore.json' },
  { name: 'Richmond', file: './richmond/super_enriched_richmond.json' },
  { name: 'Norfolk', file: './norfolk/super_enriched_norfolk.json' }
];

const nightlifeVenues = [];

for (const city of cities) {
  try {
    const data = JSON.parse(fs.readFileSync(city.file, 'utf8'));
    
    const venues = data.filter(v => 
      v.category === 'nightlife' && 
      v.website && 
      v.website !== 'null' &&
      !v.website.includes('facebook.com') &&
      !v.website.includes('instagram.com')
    );
    
    venues.forEach(v => {
      nightlifeVenues.push({
        venueName: v.venueName,
        city: city.name,
        website: v.website,
        address: v.address,
        lounge_type: v.lounge_type,
        primary_vibes: v.primary_vibes,
        needs_event_scraping: v.needs_event_scraping
      });
    });
    
    console.log(`${city.name}: ${venues.length} nightlife venues with websites`);
  } catch (err) {
    console.log(`${city.name}: File not found or error`);
  }
}

// Sort by city
nightlifeVenues.sort((a, b) => a.city.localeCompare(b.city));

fs.writeFileSync('all_nightlife_websites.json', JSON.stringify(nightlifeVenues, null, 2));

console.log(`\n✅ TOTAL: ${nightlifeVenues.length} nightlife venues with websites`);
console.log(`📄 Saved to: all_nightlife_websites.json`);
