import fs from 'fs';

const cities = [
  { name: 'NYC/NJ', file: './nyc_region/nyc_region_with_tiktok.json' },
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
    
    const venues = data.filter(v => {
      // Must have website
      if (!v.website || v.website === 'null') return false;
      if (v.website.includes('facebook.com') || v.website.includes('instagram.com')) return false;
      
      // Include if nightlife/bar/lounge/club
      return (
        v.category === 'nightlife' ||
        v.lounge_type ||
        v.late_night_spot === true ||
        v.types?.some(t => ['night_club', 'bar', 'lounge'].includes(t))
      );
    });
    
    venues.forEach(v => {
      nightlifeVenues.push({
        venueName: v.venueName,
        city: city.name,
        website: v.website,
        address: v.address,
        lounge_type: v.lounge_type,
        primary_vibes: v.primary_vibes,
        types: v.types,
        late_night_spot: v.late_night_spot,
        needs_event_scraping: v.needs_event_scraping
      });
    });
    
    console.log(`${city.name}: ${venues.length} nightlife venues with websites`);
  } catch (err) {
    console.log(`${city.name}: Error - ${err.message}`);
  }
}

nightlifeVenues.sort((a, b) => a.city.localeCompare(b.city));

fs.writeFileSync('all_nightlife_websites.json', JSON.stringify(nightlifeVenues, null, 2));

console.log(`\n✅ TOTAL: ${nightlifeVenues.length} nightlife venues with websites`);
console.log(`📄 Saved to: all_nightlife_websites.json`);

// Create summary by city
const summary = {};
nightlifeVenues.forEach(v => {
  summary[v.city] = (summary[v.city] || 0) + 1;
});

console.log('\n📊 BREAKDOWN BY CITY:');
Object.entries(summary).forEach(([city, count]) => {
  console.log(`   ${city}: ${count}`);
});
