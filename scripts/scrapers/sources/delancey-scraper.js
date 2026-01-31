import BaseScraper from '../base-scraper.js';

class DelanceyScraper extends BaseScraper {
  constructor() {
    super('delancey-dl', 'website');
    this.venues = [
      { name: 'The Delancey', url: 'https://www.thedelancey.com/events', neighborhood: 'Lower East Side' },
      { name: 'The DL', url: 'https://www.thedl-nyc.com/upcomingevents', neighborhood: 'Lower East Side' }
    ];
  }

  async scrape() {
    const allEvents = [];
    for (const venue of this.venues) {
      try {
        console.log(`[Delancey/DL] Fetching: ${venue.url}`);
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
                venue_name: venue.name, city: 'New York', neighborhood: venue.neighborhood,
                image_url: data.image, ticket_url: data.url, source_handle: venue.url, vibe_tags: ['nightlife', 'live-music']
              });
            }
          } catch {}
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[Delancey/DL] ${venue.name} error:`, error.message);
      }
    }
    return allEvents;
  }
}

export default DelanceyScraper;
