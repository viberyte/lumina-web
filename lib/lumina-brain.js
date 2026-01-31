/**
 * LUMINA BRAIN - Natural Language Understanding
 * 
 * Uses Claude to:
 * 1. Understand free-text queries
 * 2. Extract vibe, music, cuisine, location
 * 3. Consider weather and time
 * 4. Respond naturally (cool, millennial tone)
 */

import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

const anthropic = new Anthropic({ 
  apiKey: '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'
});

const OPENWEATHER_API_KEY = 'your_openweather_key_here'; // Add your key

export class LuminaBrain {
  
  /**
   * Get current weather for a city
   */
  async getWeather(city) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=imperial`
      );
      const data = await response.json();
      
      return {
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        description: data.weather[0].description
      };
    } catch (err) {
      return null;
    }
  }
  
  /**
   * Get time context
   */
  getTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    let timeOfDay = 'daytime';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else if (hour >= 21 || hour < 5) timeOfDay = 'late-night';
    
    const isWeekend = day === 0 || day === 6;
    
    return { hour, timeOfDay, isWeekend };
  }
  
  /**
   * Understand user's free-text query using Claude
   */
  async understand(userMessage, city = 'New York') {
    const weather = await this.getWeather(city);
    const time = this.getTimeContext();
    
    const contextPrompt = `You are Lumina, a cool millennial nightlife concierge. Parse this user query and respond naturally.

USER: "${userMessage}"

CONTEXT:
- Time: ${time.timeOfDay} (${time.hour}:00)
- Day: ${time.isWeekend ? 'Weekend' : 'Weekday'}
- Weather: ${weather ? `${weather.temp}°F, ${weather.description}` : 'Unknown'}
- City: ${city}

EXTRACT:
- VIBE: [dinner/lounge/nightclub/brunch or null]
- MUSIC: [afrobeats/latin/hiphop/rnb/house/jazz or null]
- CUISINE: [mexican/italian/japanese/etc or null]
- WHO: [solo/date/friends/group or null]
- WHEN: [tonight/tomorrow/weekend or null]

RESPOND in this EXACT format:

VIBE: [value or null]
MUSIC: [value or null]
CUISINE: [value or null]
WHO: [value or null]
WHEN: [value or null]
RESPONSE: [One natural, cool line that acknowledges their vibe. Be conversational, use emojis sparingly. Examples: "Afrobeats lounge vibes on a Friday night? Say less 🔥" or "Rooftop szn with this weather 👀" or "Late night eats hitting different rn"]

RULES:
- Be natural and conversational
- Use millennial slang when appropriate (vibes, fire, lowkey, say less, hitting different)
- Acknowledge weather if relevant (too cold for rooftop, perfect patio weather)
- Acknowledge time if relevant (late night, brunch hour, happy hour)
- Keep response to ONE line
- Don't be cringe, be cool`;

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: [{ role: "user", content: contextPrompt }]
      });
      
      const response = message.content[0].text;
      const lines = response.split('\n');
      
      let vibe = null;
      let music = null;
      let cuisine = null;
      let who = null;
      let when = null;
      let luminaResponse = "Let me find the perfect spot for you!";
      
      lines.forEach(line => {
        if (line.startsWith('VIBE:')) {
          const val = line.replace('VIBE:', '').trim().toLowerCase();
          vibe = val === 'null' ? null : val;
        } else if (line.startsWith('MUSIC:')) {
          const val = line.replace('MUSIC:', '').trim().toLowerCase();
          music = val === 'null' ? null : val;
        } else if (line.startsWith('CUISINE:')) {
          const val = line.replace('CUISINE:', '').trim().toLowerCase();
          cuisine = val === 'null' ? null : val;
        } else if (line.startsWith('WHO:')) {
          const val = line.replace('WHO:', '').trim().toLowerCase();
          who = val === 'null' ? null : val;
        } else if (line.startsWith('WHEN:')) {
          const val = line.replace('WHEN:', '').trim().toLowerCase();
          when = val === 'null' ? null : val;
        } else if (line.startsWith('RESPONSE:')) {
          luminaResponse = line.replace('RESPONSE:', '').trim();
        }
      });
      
      return {
        vibe,
        music,
        cuisine,
        who,
        when,
        response: luminaResponse,
        weather: weather,
        timeContext: time
      };
      
    } catch (err) {
      console.error('Lumina brain error:', err);
      return {
        vibe: null,
        music: null,
        cuisine: null,
        who: null,
        when: null,
        response: "I got you! What vibe are you feeling?",
        weather: null,
        timeContext: time
      };
    }
  }
}
