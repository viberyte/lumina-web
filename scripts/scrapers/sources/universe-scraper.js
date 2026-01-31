import BaseScraper from '../base-scraper.js';

class UniverseScraper extends BaseScraper {
  constructor() {
    super('universe', 'universe');
    this.promoters = [{ slug: 'v5-new-york-LKPH4S', name: 'V5 New York' }];
  }

  async scrape() {
    const allEvents = [];
    for (const promoter of this.promoters) {
      try {
        const url = `https://www.universe.com/users/${promoter.slug}`;
        console.log(`[Universe] Fetching: ${url}`);
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) continue;
        const html = await response.text();
        const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
        for (const match of jsonLdMatches) {
          try {
            const data = JSON.parse(match.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''));
            if (data['@type'] === 'Event') {
              allEvents.push({
                title: data.name, description: data.description, date: data.startDate?.split('T')[0],
                venue_name: data.location?.name, city: 'New York', image_url: data.image,
                ticket_url: data.url, source_handle: promoter.name, vibe_tags: ['afrobeats', 'nightlife']
              });
            }
          } catch {}
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[Universe] error:`, error.message);
      }
    }
    return allEvents;
  }
}

export default UniverseScraper;
