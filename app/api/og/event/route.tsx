import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

async function getEvent(id: string) {
  const response = await fetch(`https://lumina.viberyte.com/api/events/${id}`, {
    cache: 'no-store',
  });
  
  if (!response.ok) return null;
  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return new Response('Missing event ID', { status: 400 });
    }

    const event = await getEvent(eventId);

    if (!event) {
      return new Response('Event not found', { status: 404 });
    }

    // Get event date
    const eventDate = event.event_date ? new Date(event.event_date) : null;
    const month = eventDate ? eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
    const day = eventDate ? eventDate.getDate() : '';

    // Get image
    const imageUrl = event.cover_image_url || event.image_url || null;
    const venueName = event.venue_full_name || event.venue_name || 'TBA';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            position: 'relative',
          }}
        >
          {/* Background Image */}
          {imageUrl && (
            <img
              src={imageUrl}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.35,
              }}
            />
          )}

          {/* Gradient Overlay */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(168,85,247,0.3), rgba(0,0,0,0.9))',
            }}
          />

          {/* Date Badge */}
          {eventDate && (
            <div
              style={{
                position: 'absolute',
                top: 60,
                left: 60,
                background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                padding: '24px 32px',
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 8px 32px rgba(236,72,153,0.4)',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>{month}</div>
              <div style={{ fontSize: 56, fontWeight: 'bold', color: '#fff', lineHeight: 1 }}>{day}</div>
            </div>
          )}

          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '80px',
              width: '100%',
              height: '100%',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Event Name */}
            <div
              style={{
                fontSize: 64,
                fontWeight: 'bold',
                color: '#fff',
                textAlign: 'center',
                marginBottom: 30,
                textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                maxWidth: '90%',
                lineHeight: 1.1,
              }}
            >
              {event.name}
            </div>

            {/* Venue */}
            <div
              style={{
                fontSize: 32,
                color: '#fbbf24',
                textAlign: 'center',
                marginBottom: 40,
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              📍 {venueName}
            </div>

            {/* Viberyte Branding */}
            <div
              style={{
                fontSize: 28,
                color: '#ec4899',
                fontWeight: 'bold',
                letterSpacing: 3,
              }}
            >
              LUMINA
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error: any) {
    console.error('OG Image generation error:', error);
    return new Response(`Failed to generate image: ${error.message}`, { status: 500 });
  }
}
