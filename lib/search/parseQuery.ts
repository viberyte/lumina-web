// Semantic Search Intent Parser

const VIBES = [
  'calm', 'romantic', 'chill', 'high energy', 'upscale', 'trendy', 
  'intimate', 'cozy', 'lively', 'vibrant', 'classy', 'sophisticated',
  'laid back', 'bougie', 'fancy', 'lowkey', 'lit'
];

const MUSIC = [
  'house', 'afrobeats', 'hip hop', 'hip-hop', 'hiphop', 'latin', 
  'r&b', 'rnb', 'jazz', 'edm', 'electronic', 'reggaeton', 'salsa',
  'techno', 'deep house', 'amapiano', 'dancehall', 'soca', 'live music'
];

const FEATURES = [
  'hookah', 'byob', 'rooftop', 'outdoor', 'live music', 'dj',
  'bottle service', 'private room', 'karaoke', 'patio', 'waterfront',
  'speakeasy', 'hidden', 'secret'
];

const TIME = [
  'tonight', 'today', 'late night', 'after hours', 'brunch', 
  'happy hour', 'weekend', 'saturday', 'friday', 'sunday'
];

const OCCASION = [
  { terms: ['date', 'date night', 'romantic', 'anniversary'], value: 'date_night' },
  { terms: ['solo', 'alone', 'by myself'], value: 'solo' },
  { terms: ['group', 'friends', 'squad', 'crew'], value: 'group' },
  { terms: ['birthday', 'bday', 'celebration'], value: 'birthday' },
  { terms: ['girls night', 'ladies night'], value: 'girls_night' },
  { terms: ['guys night', 'boys night'], value: 'guys_night' },
  { terms: ['pregame', 'pre-game', 'before the club'], value: 'pregame' },
  { terms: ['business', 'client', 'work'], value: 'business' },
  { terms: ['brunch'], value: 'brunch' },
];

const CUISINE = [
  'italian', 'japanese', 'mexican', 'steakhouse', 'seafood', 'sushi',
  'thai', 'chinese', 'korean', 'indian', 'mediterranean', 'french',
  'american', 'soul food', 'caribbean', 'spanish', 'greek', 'vietnamese'
];

export interface ParsedQuery {
  vibes: string[];
  music: string[];
  features: string[];
  time: string | null;
  occasion: string | null;
  cuisine: string[];
  raw: string;
  remainingTerms: string;
}

export function parseQuery(query: string): ParsedQuery {
  const q = query.toLowerCase().trim();
  let remaining = q;
  
  // Extract vibes
  const vibes = VIBES.filter(v => q.includes(v));
  vibes.forEach(v => remaining = remaining.replace(v, ''));
  
  // Extract music
  const music = MUSIC.filter(m => q.includes(m));
  music.forEach(m => remaining = remaining.replace(m, ''));
  
  // Extract features
  const features = FEATURES.filter(f => q.includes(f));
  features.forEach(f => remaining = remaining.replace(f, ''));
  
  // Extract time
  const time = TIME.find(t => q.includes(t)) || null;
  if (time) remaining = remaining.replace(time, '');
  
  // Extract occasion
  let occasion: string | null = null;
  for (const occ of OCCASION) {
    if (occ.terms.some(t => q.includes(t))) {
      occasion = occ.value;
      occ.terms.forEach(t => remaining = remaining.replace(t, ''));
      break;
    }
  }
  
  // Extract cuisine
  const cuisine = CUISINE.filter(c => q.includes(c));
  cuisine.forEach(c => remaining = remaining.replace(c, ''));
  
  // Clean up remaining terms (for venue name search)
  remaining = remaining.replace(/\s+/g, ' ').trim();
  
  return {
    vibes,
    music,
    features,
    time,
    occasion,
    cuisine,
    raw: query,
    remainingTerms: remaining
  };
}
