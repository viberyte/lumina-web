import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Database from 'better-sqlite3';
import path from 'path';

interface VenuePageProps {
  params: { id: string };
}

function getVenue(id: string) {
  const dbPath = path.join(process.cwd(), 'data', 'lumina.db');
  const db = new Database(dbPath);
  
  const venue = db.prepare(`
    SELECT id, name, neighborhood, city, cuisine, professional_photo_url,
           price_tier, google_rating, vibe_tags, instagram_handle
    FROM venues 
    WHERE id = ?
  `).get(id);
  
  db.close();
  return venue;
}

export async function generateMetadata({ params }: VenuePageProps): Promise<Metadata> {
  const venue = getVenue(params.id) as any;

  if (!venue) {
    return { title: 'Venue Not Found | Lumina' };
  }

  const ogImageUrl = `https://lumina.viberyte.com/api/og/venue?id=${params.id}`;

  return {
    title: `${venue.name} - ${venue.neighborhood} | Lumina`,
    description: `${venue.cuisine || 'Nightlife'} in ${venue.neighborhood}, ${venue.city}. Discover the vibe on Lumina.`,
    openGraph: {
      title: venue.name,
      description: `${venue.neighborhood} • ${venue.city}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: venue.name }],
      type: 'website',
      url: `https://lumina.viberyte.com/venue/${params.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: venue.name,
      description: `${venue.neighborhood} • ${venue.city}`,
      images: [ogImageUrl],
    },
  };
}

export default function VenuePage({ params }: VenuePageProps) {
  const venue = getVenue(params.id) as any;

  if (!venue) notFound();

  let vibeTags = [];
  try {
    vibeTags = venue.vibe_tags ? JSON.parse(venue.vibe_tags) : [];
  } catch {}

  const priceLevel = '💵'.repeat(venue.price_tier || 2);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative h-[60vh] w-full">
        {venue.professional_photo_url ? (
          <Image src={venue.professional_photo_url} alt={venue.name} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <h1 className="text-5xl font-bold mb-2">{venue.name}</h1>
          <p className="text-xl text-gray-300 mb-4">{venue.neighborhood} • {venue.city}</p>
          {venue.cuisine && <p className="text-lg text-purple-300">{venue.cuisine}</p>}
        </div>
      </div>

      {/* Details */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="flex gap-8 mb-12 text-center">
          {venue.google_rating && (
            <div>
              <div className="text-3xl font-bold text-purple-400">⭐ {venue.google_rating}</div>
              <div className="text-sm text-gray-400 mt-1">Rating</div>
            </div>
          )}
          <div>
            <div className="text-3xl font-bold text-purple-400">{priceLevel}</div>
            <div className="text-sm text-gray-400 mt-1">Price Level</div>
          </div>
          {venue.instagram_handle && (
            <div>
              <a href={`https://instagram.com/${venue.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="text-3xl font-bold text-purple-400 hover:text-purple-300 transition">📸</a>
              <div className="text-sm text-gray-400 mt-1">Instagram</div>
            </div>
          )}
        </div>

        {vibeTags.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">The Vibe</h2>
            <div className="flex flex-wrap gap-3">
              {vibeTags.slice(0, 8).map((tag: string, i: number) => (
                <span key={i} className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-full text-sm">{tag}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 text-center">
          <Link href="https://apps.apple.com/app/lumina" className="inline-block px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-lg font-semibold hover:from-purple-500 hover:to-pink-500 transition transform hover:scale-105">
            Open in Lumina
          </Link>
          <p className="text-gray-400 mt-4">Plan nights, not searches.</p>
        </div>
      </div>

      <div className="border-t border-gray-800 mt-20 py-8 text-center text-gray-500 text-sm">
        <p>Powered by Lumina</p>
      </div>
    </div>
  );
}
