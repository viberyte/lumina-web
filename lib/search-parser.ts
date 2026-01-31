// Parse natural language search queries into structured filters

interface SearchIntent {
  cuisine?: string;
  vibe?: string;
  music?: string;
  neighborhood?: string;
  priceLevel?: string;
  tags?: string[];
}

export function parseSearchQuery(query: string): SearchIntent {
  const lowerQuery = query.toLowerCase();
  const intent: SearchIntent = {};

  // Cuisine patterns
  const cuisineMap: { [key: string]: string[] } = {
    'soul-food': ['soul food', 'soul', 'southern'],
    'italian': ['italian', 'pasta', 'pizza'],
    'caribbean': ['caribbean', 'jamaican', 'jerk'],
    'latin': ['latin', 'mexican', 'spanish', 'taco'],
    'japanese': ['japanese', 'sushi', 'ramen'],
    'american': ['american', 'burger'],
    'asian': ['asian', 'chinese', 'thai'],
    'ethiopian': ['ethiopian'],
    'french': ['french'],
    'indian': ['indian', 'curry'],
  };

  // Music/genre patterns
  const musicMap: { [key: string]: string[] } = {
    'afrobeats': ['afrobeat', 'afrobeats', 'afro'],
    'hip-hop': ['hip hop', 'hiphop', 'rap'],
    'latin': ['reggaeton', 'salsa', 'bachata'],
    'rnb': ['r&b', 'rnb', 'r and b'],
    'house': ['house', 'edm', 'electronic'],
    'jazz': ['jazz'],
    'live': ['live music', 'live band'],
  };

  // Vibe patterns
  const vibeMap: { [key: string]: string[] } = {
    'dinner': ['dinner', 'restaurant', 'dining', 'eat'],
    'lounge': ['lounge', 'chill', 'relaxed'],
    'nightlife': ['club', 'nightclub', 'party', 'dance'],
    'cafe': ['cafe', 'coffee', 'café'],
    'attraction': ['attraction', 'museum', 'activity'],
  };

  // Neighborhood patterns
  const neighborhoodMap: { [key: string]: string[] } = {
    'Brooklyn': ['brooklyn', 'williamsburg', 'bushwick'],
    'Manhattan': ['manhattan', 'soho', 'tribeca', 'lower east side'],
    'Queens': ['queens', 'astoria', 'long island city'],
  };

  // Price patterns
  const priceMap: { [key: string]: string[] } = {
    '$': ['cheap', 'budget', 'affordable', 'inexpensive'],
    '$$': ['moderate', 'mid-range', 'reasonable'],
    '$$$': ['upscale', 'nice', 'fancy', 'expensive'],
    '$$$$': ['luxury', 'high-end', 'premium', 'fine dining'],
  };

  // Tag patterns
  const tagPatterns = [
    'date night', 'romantic', 'hookah', 'rooftop', 'outdoor',
    'solo friendly', 'group', 'business', 'late night',
    'trendy', 'intimate', 'vibrant', 'quiet'
  ];

  // Parse cuisine
  for (const [cuisine, keywords] of Object.entries(cuisineMap)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      intent.cuisine = cuisine;
      break;
    }
  }

  // Parse music
  for (const [music, keywords] of Object.entries(musicMap)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      intent.music = music;
      break;
    }
  }

  // Parse vibe
  for (const [vibe, keywords] of Object.entries(vibeMap)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      intent.vibe = vibe;
      break;
    }
  }

  // Parse neighborhood
  for (const [neighborhood, keywords] of Object.entries(neighborhoodMap)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      intent.neighborhood = neighborhood;
      break;
    }
  }

  // Parse price
  for (const [price, keywords] of Object.entries(priceMap)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      intent.priceLevel = price;
      break;
    }
  }

  // Parse tags
  const foundTags = tagPatterns.filter(tag => lowerQuery.includes(tag));
  if (foundTags.length > 0) {
    intent.tags = foundTags.map(tag => tag.replace(/ /g, '-'));
  }

  return intent;
}

// Convert search intent to preference object
export function intentToPreferences(intent: SearchIntent, city: string): any {
  return {
    city,
    cuisine: intent.cuisine,
    vibe: intent.vibe,
    music: intent.music,
    who: intent.tags?.includes('date-night') ? 'date' :
         intent.tags?.includes('business') ? 'business' :
         intent.tags?.includes('solo-friendly') ? 'solo' : undefined,
  };
}
