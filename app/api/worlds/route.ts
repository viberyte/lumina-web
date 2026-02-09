import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const WORLDS = [
  {
    key: 'soul',
    title: 'Soul Food',
    tagline: 'Southern comfort. Real roots.',
    emoji: '🍗',
    gradient: ['#1a1510', '#0a0a08'],
    entry_tags: ['Southern', 'Comfort', 'Classic'],
  },
  {
    key: 'caribbean',
    title: 'Caribbean',
    tagline: 'Island vibes. Bold flavors.',
    emoji: '🌴',
    gradient: ['#1a2d20', '#0d1a10'],
    entry_tags: ['Jamaican', 'Trinidadian', 'Haitian', 'Island'],
  },
  {
    key: 'african',
    title: 'African',
    tagline: 'Rich traditions. Bold spices.',
    emoji: '🌍',
    gradient: ['#2d1a15', '#1a0d0a'],
    entry_tags: ['Nigerian', 'Ethiopian', 'Senegalese', 'West African'],
  },
  {
    key: 'latin',
    title: 'Latin',
    tagline: 'Passion on every plate and dance floor.',
    emoji: '💃',
    gradient: ['#1a0a0f', '#0d0508'],
    entry_tags: ['Reggaeton', 'Peruvian', 'Mexican', 'Fuego'],
  },
  {
    key: 'asia',
    title: 'Asia',
    tagline: 'From quiet counters to neon nights.',
    emoji: '🥢',
    gradient: ['#10121a', '#08080d'],
    entry_tags: ['Sushi', 'Dim Sum', 'BBQ', 'Curry', 'Pho'],
  },
  {
    key: 'med',
    title: 'Mediterranean',
    tagline: 'Sun-soaked flavors, shared tables.',
    emoji: '🫒',
    gradient: ['#0a1518', '#050a0c'],
    entry_tags: ['Greek', 'Turkish', 'Lebanese', 'Fresh'],
  },
  {
    key: 'european',
    title: 'European',
    tagline: 'Old world charm, timeless taste.',
    emoji: '🍝',
    gradient: ['#18100a', '#0a0805'],
    entry_tags: ['Pasta', 'Bistro', 'Classic', 'Wine'],
  },
  {
    key: 'prime',
    title: 'Prime',
    tagline: 'For the bold appetite.',
    emoji: '🥩',
    gradient: ['#1a0a08', '#0d0504'],
    entry_tags: ['Dry-Aged', 'Oysters', 'Lobster', 'Bold'],
  },
  {
    key: 'clean',
    title: 'Clean',
    tagline: 'Plant-forward, health-conscious.',
    emoji: '🌱',
    gradient: ['#0a1a0f', '#050d08'],
    entry_tags: ['Plant-Based', 'Organic', 'Creative', 'Fresh'],
  },
  {
    key: 'vibes',
    title: 'Vibes',
    tagline: 'Where the night takes shape.',
    emoji: '🎧',
    gradient: ['#14101a', '#0a080d'],
    entry_tags: ['Hip-Hop', 'Jazz', 'EDM', 'Late Night'],
  },
];

export async function GET(request: NextRequest) {
  return NextResponse.json({
    worlds: WORLDS,
    count: WORLDS.length,
  }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
