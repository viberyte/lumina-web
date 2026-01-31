import BaseScraper from '../base-scraper.js';

class DICEScraper extends BaseScraper {
  constructor() {
    super('dice', 'dice');
    this.urls = ['https://dice.fm/events/new-york'];
  }

  async scrape() {
    const allEvents = [];
    for (const url of this.urls) {
      try {
        console.log(`[DICE] Fetching: ${url}`);
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) continue;
        const html = await response.text();
        const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
        
        for (const match of jsonLdMatches) {
          try {
            const data = JSON.parse(match.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''));
            if (data['@type'] === 'Event') {
              
              // Extract lineup from performer field
              let lineup = null;
              if (data.performer) {
                const performers = Array.isArray(data.performer) ? data.performer : [data.performer];
                lineup = JSON.stringify(performers.map(p => ({
                  name: p.name,
                  type: p['@type']
                })));
              }
              
              // Extract ticket prices
              let ticketPrice = null;
              let priceRange = null;
              if (data.offers) {
                const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
                const prices = offers
                  .filter(o => o.price)
                  .map(o => parseFloat(o.price))
                  .filter(p => !isNaN(p));
                
                if (prices.length > 0) {
                  ticketPrice = Math.min(...prices);
                  if (prices.length > 1) {
                    priceRange = `$${Math.min(...prices)} - $${Math.max(...prices)}`;
                  } else {
                    priceRange = `$${prices[0]}`;
                  }
                }
              }
              
              // Extract door time (if available)
              let doorTime = null;
              if (data.doorTime) {
                doorTime = data.doorTime;
              }
              
              // Extract full datetimes
              let startDatetime = null;
              let endDatetime = null;
              if (data.startDate) {
                startDatetime = new Date(data.startDate).toISOString();
              }
              if (data.endDate) {
                endDatetime = new Date(data.endDate).toISOString();
              }
              
              // Extract dress code from description (if mentioned)
              let dressCode = null;
              const description = data.description || '';
              if (description.match(/dress code|attire|dress to impress/i)) {
                const dressCodes = description.match(/(dress code|attire)[:;\s]*(.*?)([.!?]|$)/i);
                if (dressCodes && dressCodes[2]) {
                  dressCode = dressCodes[2].trim().substring(0, 100);
                }
              }
              
              allEvents.push({
                title: data.name,
                description: data.description,
                date: data.startDate?.split('T')[0],
                venue_name: data.location?.name,
                city: 'New York',
                image_url: data.image,
                ticket_url: data.url,
                source_handle: 'dice.fm',
                vibe_tags: ['nightlife'],
                
                // NEW FIELDS
                lineup: lineup,
                door_time: doorTime,
                start_datetime: startDatetime,
                end_datetime: endDatetime,
                ticket_price: ticketPrice,
                price_range: priceRange,
                dress_code: dressCode
              });
            }
          } catch (e) {
            console.error('[DICE] Parse error:', e.message);
          }
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[DICE] error:`, error.message);
      }
    }
    return allEvents;
  }
}

export default DICEScraper;
