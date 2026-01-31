import fs from 'fs';

const cities = [
  './dc/super_enriched_dc.json',
  './philly/super_enriched_philly.json',
  './baltimore/super_enriched_baltimore.json',
  './richmond/super_enriched_richmond.json',
  './norfolk/super_enriched_norfolk.json'
];

const trainingData = [];

for (const cityFile of cities) {
  const venues = JSON.parse(fs.readFileSync(cityFile, 'utf8'));
  
  venues.forEach(venue => {
    // Skip if no AI intelligence
    if (!venue.cuisine_primary && !venue.primary_vibes) return;
    
    // Create training example
    const input = `Venue: ${venue.venueName}
Address: ${venue.address}
Google Reviews: ${venue.googleReviews?.slice(0, 3).join(' | ') || 'none'}
Yelp Reviews: ${venue.yelpReviews?.slice(0, 3).join(' | ') || 'none'}`;

    const output = {
      category: venue.category,
      cuisine_primary: venue.cuisine_primary,
      cuisine_secondary: venue.cuisine_secondary,
      cuisine_style: venue.cuisine_style,
      primary_vibes: venue.primary_vibes,
      secondary_vibes: venue.secondary_vibes,
      lounge_type: venue.lounge_type,
      music_genres: venue.music_genres,
      energy_level: venue.energy_level,
      first_date_suitable: venue.first_date_suitable,
      anniversary_suitable: venue.anniversary_suitable,
      girls_night_suitable: venue.girls_night_suitable,
      guys_night_suitable: venue.guys_night_suitable,
      pregame_suitable: venue.pregame_suitable,
      late_night_spot: venue.late_night_spot,
      customer_insights: venue.customer_insights
    };
    
    // OpenAI fine-tuning format
    trainingData.push({
      messages: [
        {
          role: "system",
          content: "You are Lumina's nightlife AI. Analyze venues and extract intelligence about vibes, use cases, and atmosphere."
        },
        {
          role: "user",
          content: input
        },
        {
          role: "assistant",
          content: JSON.stringify(output)
        }
      ]
    });
  });
}

// Save in JSONL format (required by OpenAI)
const jsonl = trainingData.map(d => JSON.stringify(d)).join('\n');
fs.writeFileSync('lumina_finetuning_dataset.jsonl', jsonl);

console.log(`✅ Created fine-tuning dataset!`);
console.log(`   Total examples: ${trainingData.length}`);
console.log(`   File: lumina_finetuning_dataset.jsonl`);
console.log(`\nNext steps:`);
console.log(`1. Upload to OpenAI: openai.files.create(file=open("lumina_finetuning_dataset.jsonl"))`);
console.log(`2. Create fine-tune job: openai.fine_tuning.jobs.create()`);
console.log(`3. Use your custom model: model="ft:gpt-4o-mini:lumina:..."`);
