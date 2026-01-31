import BaseScraper from '../base-scraper.js';

class JoonbugScraper extends BaseScraper {
  constructor() {
    super('joonbug', 'joonbug');
    this.cities = ['newyork', 'hoboken'];
  }

  async scrape() {
    const allEvents = [];
    for (const city of this.cities) {
      try {
        const url = `https://joonbug.com/${city}`;
        console.log(`[Joonbug] Fetching: ${url}`);
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
                venue_name: data.location?.name, city: city === 'newyork' ? 'New York' : 'Hoboken',
                image_url: data.image, ticket_url: data.url, source_handle: 'joonbug.com', vibe_tags: ['nightlife']
              });
            }
          } catch {}
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[Joonbug] ${city} error:`, error.message);
      }
    }
    return allEvents;
  }
}

export default JoonbugScraper;
