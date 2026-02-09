const fs = require('fs');
const axios = require('axios');
const Database = require('better-sqlite3');

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

console.log('PROMOTER SCRAPER - From Event Pages\n');

const promoters = [];

// Get all event URLs
const events = db.prepare(`
  SELECT id, name, ticket_url, venue_name, city
  FROM events 
  WHERE ticket_url IS NOT NULL AND ticket_url != ''
`).all();

console.log(`Events with ticket URLs: ${events.length}\n`);

async function scrapeRA(url, eventName, venue) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      timeout: 15000
    });
    
    const html = res.data;
    
    // Extract promoter from RA page
    const promoterMatch = html.match(/Presented by[:\s]*<[^>]*>([^<]+)/i) ||
                          html.match(/Promoter[:\s]*<[^>]*>([^<]+)/i) ||
                          html.match(/"promoter"[:\s]*"([^"]+)"/i) ||
                          html.match(/promoters.*?name[:\s]*"([^"]+)"/i);
    
    // Extract organizer
    const organizerMatch = html.match(/Organiser[:\s]*<[^>]*>([^<]+)/i) ||
                           html.match(/Organizer[:\s]*<[^>]*>([^<]+)/i);
    
    // Extract Instagram handles from page
    const igMatches = html.matchAll(/instagram\.com\/([a-zA-Z0-9_.]+)/gi);
    const instagrams = [...igMatches].map(m => m[1]).filter(h => 
      !['p', 'reel', 'explore', 'stories'].includes(h.toLowerCase())
    );
    
    // Extract emails
    const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    
    // Extract booking links
    const bookingMatch = html.match(/book(?:ing)?[:\s]*<a[^>]*href="([^"]+)"/i);
    
    const name = promoterMatch?.[1] || organizerMatch?.[1];
    
    if (name) {
      return {
        name: name.trim(),
        instagram: instagrams[0] || null,
        email: emailMatch?.[1] || null,
        booking_url: bookingMatch?.[1] || null,
        source: 'ra',
        event_name: eventName,
        venue: venue,
        event_url: url
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function scrapePosh(url, eventName, venue) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    
    const html = res.data;
    
    // Posh shows host/promoter info
    const hostMatch = html.match(/hosted by[:\s]*([^<\n]+)/i) ||
                      html.match(/promoter[:\s]*([^<\n]+)/i) ||
                      html.match(/"host"[:\s]*"([^"]+)"/i) ||
                      html.match(/organizer[:\s]*"([^"]+)"/i);
    
    const igMatches = html.matchAll(/instagram\.com\/([a-zA-Z0-9_.]+)/gi);
    const instagrams = [...igMatches].map(m => m[1]).filter(h => 
      !['p', 'reel', 'explore', 'stories', 'paborhood'].includes(h.toLowerCase())
    );
    
    const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    
    // Phone numbers
    const phoneMatch = html.match(/(\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
    
    const name = hostMatch?.[1];
    
    if (name) {
      return {
        name: name.trim(),
        instagram: instagrams[0] || null,
        email: emailMatch?.[1] || null,
        phone: phoneMatch?.[1] || null,
        source: 'posh',
        event_name: eventName,
        venue: venue,
        event_url: url
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function scrapeDice(url, eventName, venue) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    
    const html = res.data;
    
    const promoterMatch = html.match(/presented by[:\s]*([^<\n]+)/i) ||
                          html.match(/"promoter"[:\s]*\{[^}]*"name"[:\s]*"([^"]+)"/i);
    
    const igMatches = html.matchAll(/instagram\.com\/([a-zA-Z0-9_.]+)/gi);
    const instagrams = [...igMatches].map(m => m[1]).filter(h => 
      !['p', 'reel', 'explore', 'stories'].includes(h.toLowerCase())
    );
    
    const name = promoterMatch?.[1];
    
    if (name) {
      return {
        name: name.trim(),
        instagram: instagrams[0] || null,
        source: 'dice',
        event_name: eventName,
        venue: venue,
        event_url: url
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function run() {
  let raCount = 0, poshCount = 0, diceCount = 0;
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const url = event.ticket_url;
    const label = `[${i + 1}/${events.length}]`;
    
    let promoter = null;
    
    if (url.includes('ra.co')) {
      process.stdout.write(`${label} RA: ${event.name.slice(0, 30).padEnd(30)} `);
      promoter = await scrapeRA(url, event.name, event.venue_name);
      if (promoter) raCount++;
    } else if (url.includes('posh.vip')) {
      process.stdout.write(`${label} Posh: ${event.name.slice(0, 28).padEnd(28)} `);
      promoter = await scrapePosh(url, event.name, event.venue_name);
      if (promoter) poshCount++;
    } else if (url.includes('dice.fm')) {
      process.stdout.write(`${label} Dice: ${event.name.slice(0, 28).padEnd(28)} `);
      promoter = await scrapeDice(url, event.name, event.venue_name);
      if (promoter) diceCount++;
    } else {
      continue;
    }
    
    if (promoter) {
      promoters.push(promoter);
      console.log(`✅ ${promoter.name} ${promoter.instagram ? '@' + promoter.instagram : ''}`);
    } else {
      console.log(`❌`);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
    
    // Progress save
    if ((i + 1) % 50 === 0) {
      fs.writeFileSync('/opt/viberyte/lumina-web/data/promoters_scraped.json', JSON.stringify(promoters, null, 2));
      console.log(`\n  💾 Saved ${promoters.length} promoters\n`);
    }
  }
  
  // Dedupe by name
  const unique = new Map();
  for (const p of promoters) {
    const key = p.name.toLowerCase();
    if (!unique.has(key) || (p.instagram && !unique.get(key).instagram)) {
      unique.set(key, p);
    }
  }
  
  const finalList = Array.from(unique.values());
  fs.writeFileSync('/opt/viberyte/lumina-web/data/promoters_scraped.json', JSON.stringify(finalList, null, 2));
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  PROMOTER SCRAPE COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`From RA: ${raCount}`);
  console.log(`From Posh: ${poshCount}`);
  console.log(`From Dice: ${diceCount}`);
  console.log(`Total unique: ${finalList.length}`);
  console.log(`\nWith Instagram: ${finalList.filter(p => p.instagram).length}`);
  console.log(`With Email: ${finalList.filter(p => p.email).length}`);
  console.log(`With Phone: ${finalList.filter(p => p.phone).length}`);
  console.log(`\nSaved: data/promoters_scraped.json`);
}

run().catch(e => { console.error('FATAL:', e.message); });
