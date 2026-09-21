import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('id');

    if (!venueId) {
      return new Response('Missing venue ID', { status: 400 });
    }

    // Fetch from your existing API
    const apiUrl = `https://lumina.viberyte.com/api/venues/${venueId}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      return new Response('Venue not found', { status: 404 });
    }

    const venue = await response.json();

    // Parse vibe tags safely
    let vibeTags = [];
    try {
      if (typeof venue.vibe_tags === 'string') {
        vibeTags = JSON.parse(venue.vibe_tags);
      } else if (Array.isArray(venue.vibe_tags)) {
        vibeTags = venue.vibe_tags;
      }
    } catch {
      vibeTags = [];
    }
    const topTags = vibeTags.slice(0, 3);

    // Get image URL
    const imageUrl = venue.professional_photo_url || null;

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
          {/* Background Image with Overlay */}
          {imageUrl && (
            <img
              src={imageUrl}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.4,
              }}
            />
          )}

          {/* Gradient Overlay */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.95))',
            }}
          />

          {/* Content Container */}
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
            {/* Venue Name */}
            <div
              style={{
                fontSize: 72,
                fontWeight: 'bold',
                color: '#fff',
                textAlign: 'center',
                marginBottom: 20,
                textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                maxWidth: '90%',
              }}
            >
              {venue.name || 'Venue'}
            </div>

            {/* Location */}
            {venue.neighborhood && venue.city && (
              <div
                style={{
                  fontSize: 36,
                  color: '#d8b4fe',
                  textAlign: 'center',
                  marginBottom: 30,
                  textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                }}
              >
                {venue.neighborhood} • {venue.city}
              </div>
            )}

            {/* Cuisine */}
            {venue.cuisine && (
              <div
                style={{
                  fontSize: 28,
                  color: '#e9d5ff',
                  textAlign: 'center',
                  marginBottom: 30,
                }}
              >
                {venue.cuisine}
              </div>
            )}

            {/* Vibe Tags */}
            {topTags.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 15,
                  marginBottom: 40,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                {topTags.map((tag: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 24px',
                      background: 'rgba(168, 85, 247, 0.2)',
                      border: '2px solid rgba(168, 85, 247, 0.5)',
                      borderRadius: 25,
                      color: '#e9d5ff',
                      fontSize: 24,
                    }}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}

            {/* Viberyte Branding */}
            <div
              style={{
                fontSize: 28,
                color: '#a855f7',
                fontWeight: 'bold',
                letterSpacing: 2,
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
