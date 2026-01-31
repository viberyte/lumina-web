import BaseScraper from '../base-scraper.js';

class VenueWebsitesScraper extends BaseScraper {
  constructor() {
    super('venue-websites', 'website');
    this.venues = [
      { name: 'Nebula', url: 'https://nebulanewyork.com/events/', vibes: ['club', 'edm'] },
      { name: 'Somewhere Nowhere', url: 'https://www.somewherenowherenyc.com/events', vibes: ['rooftop', 'upscale'] },
      { name: 'Dream Hospitality', url: 'https://tickets.dreamhospitalitygroup.com', vibes: ['upscale', 'nightlife'] }
    ];
  }

  async scrape() {
    const allEvents = [];
    for (const venue of this.venues) {
      try {
        console.log(`[VenueWebsites] Fetching: ${venue.url}`);
        const response = await fetch(venue.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) continue;
        const html = await response.text();
        const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
        for (const match of jsonLdMatches) {
          try {
            const data = JSON.parse(match.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''));
            if (data['@type'] === 'Event') {
              allEvents.push({
                title: data.name, description: data.description, date: data.startDate?.split('T')[0],
                venue_name: venue.name, city: 'New York', image_url: data.image,
                ticket_url: data.url || venue.url, source_handle: venue.url, vibe_tags: venue.vibes
              });
            }
          } catch {}
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[VenueWebsites] ${venue.name} error:`, error.message);
      }
    }
    return allEvents;
  }
}

export default VenueWebsitesScraper;
