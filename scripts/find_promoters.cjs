const fs = require('fs');
const axios = require('axios');

const APIFY_KEY = 'apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel';

// Search terms that identify promoters
const SEARCH_QUERIES = [
  'nyc promoter',
  'nyc club promoter',
  'nyc nightlife promoter',
  'new york promoter',
  'manhattan promoter',
  'brooklyn promoter',
  'nj promoter',
  'newark promoter',
  'jersey city promoter',
  'nyc vip host',
  'nyc bottle service',
  'nyc guestlist',
  'nyc table service',
  'nyc sections',
  'nyc nightlife host',
  'bronx promoter',
  'queens promoter',
  'hoboken promoter',
];

// Bio keywords that confirm they're promoters
const BIO_KEYWORDS = [
  'promoter', 'promo', 'bookings', 'book me', 'tables', 'sections',
  'vip', 'bottle service', 'guestlist', 'guest list', 'rsvp',
  'nightlife', 'club host', 'dm for', 'text for', 'call for',
  'reservations', 'hosting', 'party host', 'event host',
];

async function searchPromoters(query) {
  try {
    const res = await axios.post(
      'https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items',
      {
        search: query,
        resultsLimit: 50,
        searchType: 'user',
      },
      {
        headers: { 'Authorization': `Bearer ${APIFY_KEY}` },
        params: { token: APIFY_KEY, timeout: 120 },
        timeout: 120000,
      }
    );
    return res.data || [];
  } catch (e) {
    console.log(`  ⚠️ Error: ${e.message}`);
    return [];
  }
}

function extractPhone(text) {
  if (!text) return null;
  // Match phone patterns
  const patterns = [
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
    /\d{10}/g,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[0].replace(/\D/g, '');
  }
  return null;
}

function extractEmail(text) {
  if (!text) return null;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

function isPromoter(bio) {
  if (!bio) return false;
  const lower = bio.toLowerCase();
  return BIO_KEYWORDS.some(kw => lower.includes(kw));
}

async function run() {
  console.log('PROMOTER FINDER\n');
  console.log(`Searching ${SEARCH_QUERIES.length} queries...\n`);
  
  const allPromoters = new Map(); // dedupe by username
  
  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const query = SEARCH_QUERIES[i];
    console.log(`[${i+1}/${SEARCH_QUERIES.length}] "${query}"`);
    
    const results = await searchPromoters(query);
    
    for (const user of results) {
      const username = user.username?.toLowerCase();
      if (!username || allPromoters.has(username)) continue;
      
      const bio = user.biography || user.bio || '';
      if (!isPromoter(bio)) continue;
      
      const promoter = {
        username,
        full_name: user.fullName || user.full_name || '',
        bio,
        followers: user.followersCount || user.followers || 0,
        phone: extractPhone(bio),
        email: extractEmail(bio),
        profile_url: `https://instagram.com/${username}`,
        source_query: query,
      };
      
      allPromoters.set(username, promoter);
      console.log(`  ✅ @${username} ${promoter.phone ? '📱' + promoter.phone : ''} ${promoter.email ? '✉️' : ''}`);
    }
    
    console.log(`  → Found ${results.length} profiles, ${allPromoters.size} promoters total\n`);
    
    // Rate limit
    await new Promise(r => setTimeout(r, 3000));
  }
  
  const promoters = Array.from(allPromoters.values());
  
  // Sort by followers
  promoters.sort((a, b) => b.followers - a.followers);
  
  fs.writeFileSync('/opt/viberyte/lumina-web/data/promoters.json', JSON.stringify(promoters, null, 2));
  
  // Stats
  const withPhone = promoters.filter(p => p.phone).length;
  const withEmail = promoters.filter(p => p.email).length;
  
  console.log(`${'='.repeat(50)}`);
  console.log(`  PROMOTER SEARCH COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total promoters: ${promoters.length}`);
  console.log(`With phone: ${withPhone}`);
  console.log(`With email: ${withEmail}`);
  console.log(`\nTop 10 by followers:`);
  promoters.slice(0, 10).forEach(p => {
    console.log(`  @${p.username.padEnd(25)} ${p.followers.toLocaleString().padStart(8)} followers ${p.phone ? '📱' : '  '} ${p.email ? '✉️' : ''}`);
  });
  console.log(`\nSaved: data/promoters.json`);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
