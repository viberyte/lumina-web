interface FlowStop {
  venue: any;
  purpose: string;
  duration: string;
  order: number;
}

interface FlowExperience {
  title: string;
  description: string;
  stops: FlowStop[];
  totalDuration: string;
}

export function generateFlowExperience(
  mainVenue: any,
  allVenues: any[],
  preferences: { who: string; vibe: string; music?: string }
): FlowExperience {
  const { who, vibe } = preferences;

  // Date Night Flow
  if (who === 'date') {
    if (vibe === 'dinner') {
      return {
        title: 'Romantic Evening',
        description: 'A perfect date night from dinner to intimate moments',
        stops: [
          {
            venue: mainVenue,
            purpose: 'Dinner',
            duration: '1.5-2 hours',
            order: 1
          },
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['dessert', 'cafe', 'bakery']),
            purpose: 'Dessert & Coffee',
            duration: '30-45 mins',
            order: 2
          },
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['lounge', 'wine-bar', 'cocktail']),
            purpose: 'Drinks & Conversation',
            duration: '1-1.5 hours',
            order: 3
          }
        ],
        totalDuration: '3-4 hours'
      };
    }
    
    if (vibe === 'lounge') {
      return {
        title: 'Chill Date Night',
        description: 'Relaxed evening with great vibes',
        stops: [
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['dinner', 'restaurant']),
            purpose: 'Light Bites',
            duration: '45 mins',
            order: 1
          },
          {
            venue: mainVenue,
            purpose: 'Lounge & Drinks',
            duration: '2 hours',
            order: 2
          }
        ],
        totalDuration: '2.5-3 hours'
      };
    }
  }

  // Friends Night Flow
  if (who === 'friends') {
    if (vibe === 'lounge' || vibe === 'dinner') {
      return {
        title: 'Night Out With The Crew',
        description: 'Start chill, end hype',
        stops: [
          {
            venue: mainVenue,
            purpose: vibe === 'dinner' ? 'Dinner' : 'Pre-game',
            duration: '1-1.5 hours',
            order: 1
          },
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['bar', 'lounge', 'hookah']),
            purpose: 'Drinks & Vibes',
            duration: '1.5 hours',
            order: 2
          },
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['club', 'nightlife', 'event']),
            purpose: 'Turn Up',
            duration: '2-3 hours',
            order: 3
          },
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['late-night', 'diner', 'food']),
            purpose: 'Late Night Eats',
            duration: '30-45 mins',
            order: 4
          }
        ],
        totalDuration: '5-7 hours'
      };
    }

    if (vibe === 'events') {
      return {
        title: 'Event Night',
        description: 'Build up to the main event',
        stops: [
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['dinner', 'restaurant']),
            purpose: 'Dinner',
            duration: '1 hour',
            order: 1
          },
          {
            venue: mainVenue,
            purpose: 'Main Event',
            duration: '3-4 hours',
            order: 2
          },
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['late-night', 'diner']),
            purpose: 'Post-Event Food',
            duration: '45 mins',
            order: 3
          }
        ],
        totalDuration: '5-6 hours'
      };
    }
  }

  // Solo Vibes Flow
  if (who === 'solo') {
    if (vibe === 'cafe') {
      return {
        title: 'Solo Exploration',
        description: 'Your personal journey',
        stops: [
          {
            venue: mainVenue,
            purpose: 'Coffee & Work/Read',
            duration: '1-2 hours',
            order: 1
          },
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['attraction', 'museum', 'gallery', 'park']),
            purpose: 'Explore',
            duration: '1-1.5 hours',
            order: 2
          },
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['bar', 'lounge']),
            purpose: 'Evening Drink',
            duration: '1 hour',
            order: 3
          }
        ],
        totalDuration: '3-4.5 hours'
      };
    }

    if (vibe === 'lounge') {
      return {
        title: 'Solo Night Out',
        description: 'Meet new people, enjoy the vibe',
        stops: [
          {
            venue: findNearbyVenue(mainVenue, allVenues, ['dinner', 'restaurant']),
            purpose: 'Dinner',
            duration: '45 mins',
            order: 1
          },
          {
            venue: mainVenue,
            purpose: 'Lounge & Socialize',
            duration: '2-3 hours',
            order: 2
          }
        ],
        totalDuration: '3-4 hours'
      };
    }
  }

  // Business Flow
  if (who === 'business') {
    return {
      title: 'Professional Evening',
      description: 'Business with a touch of class',
      stops: [
        {
          venue: mainVenue,
          purpose: vibe === 'dinner' ? 'Business Dinner' : 'Meeting Spot',
          duration: '1.5-2 hours',
          order: 1
        },
        {
          venue: findNearbyVenue(mainVenue, allVenues, ['lounge', 'wine-bar', 'upscale']),
          purpose: 'Drinks & Networking',
          duration: '1 hour',
          order: 2
        }
      ],
      totalDuration: '2.5-3 hours'
    };
  }

  // Default fallback
  return {
    title: 'Evening Experience',
    description: 'A curated night out',
    stops: [
      {
        venue: mainVenue,
        purpose: 'Main Stop',
        duration: '2 hours',
        order: 1
      }
    ],
    totalDuration: '2 hours'
  };
}

function findNearbyVenue(mainVenue: any, allVenues: any[], tags: string[]): any {
  // Filter venues by tags
  const matches = allVenues.filter(v => {
    if (v.id === mainVenue.id) return false;
    
    const venueTags = [
      v.category?.toLowerCase(),
      v.subcategory?.toLowerCase(),
      ...(v.vibes || []).map((t: string) => t.toLowerCase())
    ].filter(Boolean);

    return tags.some(tag => 
      venueTags.some(vt => vt.includes(tag))
    );
  });

  // Return highest rated match or placeholder
  if (matches.length > 0) {
    return matches.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  }

  return {
    name: 'Nearby Spot',
    neighborhood: mainVenue.neighborhood,
    photoUrl: '/venue-placeholder.jpg'
  };
}
