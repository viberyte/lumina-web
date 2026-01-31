import { notFound } from 'next/navigation';
import Database from 'better-sqlite3';
import Link from 'next/link';
import path from 'path';

interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  bottleCount?: number;
  maxGuests?: number;
}

function getEvent(slug: string) {
  const parts = slug.split('-');
  const id = parseInt(parts[parts.length - 1]);
  if (isNaN(id)) return null;

  const db = new Database(path.join(process.cwd(), 'data', 'lumina.db'));
  
  try {
    const event = db.prepare(`
      SELECT pe.*, 
             pv.name as venue_name, 
             pv.address as venue_address,
             pp.id as partner_id,
             pp.business_name as promoter_name, 
             pp.instagram_handle as promoter_ig, 
             pp.profile_picture as promoter_photo
      FROM partner_events pe
      LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
      LEFT JOIN partners pp ON pe.partner_id = pp.id
      WHERE pe.id = ? AND pe.status = 'published'
    `).get(id) as any;

    return event;
  } finally {
    db.close();
  }
}

function parsePackages(packagesJson: string | null): Package[] {
  if (!packagesJson) return [];
  try {
    const parsed = JSON.parse(packagesJson);
    return Array.isArray(parsed) ? parsed.filter(p => p?.name && typeof p.price === 'number') : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return { title: 'Event Not Found' };

  return {
    title: `${event.title} | Lumina`,
    description: event.description || `${event.title} at ${event.venue_name}`,
    openGraph: {
      title: event.title,
      description: event.description || `${event.title} at ${event.venue_name}`,
      images: event.image_url ? [event.image_url] : [],
    },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  // Parse packages from JSON field
  const packages = parsePackages(event.packages);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const genres = event.genre?.split(',').map((g: string) => g.trim()).filter(Boolean) || [];

  const getCTAText = () => {
    if (packages.length > 0) return 'Book a Table';
    if (event.guest_list_enabled === 1) return 'Join Guest List';
    return 'Contact Promoter';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative">
        {event.image_url ? (
          <div 
            className="h-72 bg-cover bg-center"
            style={{ backgroundImage: `url(${event.image_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-b from-zinc-900 to-black" />
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-3">
            {genres.slice(0, 2).map((genre: string) => (
              <span key={genre} className="px-3 py-1 text-xs font-medium bg-white/10 backdrop-blur rounded-full">
                {genre}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
        </div>
      </div>

      {/* Details */}
      <div className="px-6 py-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center">
            <span className="text-lg">📍</span>
          </div>
          <div className="flex-1">
            <p className="font-medium">{event.venue_name}</p>
            {event.venue_address && (
              <p className="text-sm text-zinc-500">{event.venue_address}</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center">
            <span className="text-lg">🗓</span>
          </div>
          <div className="flex-1">
            <p className="font-medium">{formatDate(event.event_date)}</p>
            <p className="text-sm text-zinc-500">{event.event_time || 'Doors open 10pm'}</p>
          </div>
        </div>

        {event.description && (
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            {event.description}
          </p>
        )}

        {/* Packages - from JSON */}
        {packages.length > 0 && (
          <div className="mb-8" id="packages">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
              Table Packages
            </h2>
            <div className="space-y-3">
              {packages.map((pkg: Package, index: number) => (
                <div 
                  key={pkg.id || index} 
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      {pkg.description && (
                        <p className="text-sm text-zinc-500 mt-1">{pkg.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">${pkg.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
                    {pkg.bottleCount && (
                      <span className="flex items-center gap-1">
                        🍾 {pkg.bottleCount} bottles
                      </span>
                    )}
                    {pkg.maxGuests && (
                      <span className="flex items-center gap-1">
                        👥 Up to {pkg.maxGuests} guests
                      </span>
                    )}
                  </div>
                  <Link href={`lumina://event/${event.id}?book=true&package=${pkg.id}`}>
                    <button className="w-full mt-4 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors">
                      Book Now
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guest List Option */}
        {event.guest_list_enabled === 1 && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Guest List</h3>
                <p className="text-sm text-zinc-500">Skip the line</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {event.guest_list_price > 0 ? `$${event.guest_list_price}` : 'Free'}
                </p>
              </div>
            </div>
            <Link href={`lumina://event/${event.id}?guestlist=true`}>
              <button className="w-full mt-4 py-3 border border-white/20 text-white font-medium rounded-xl hover:bg-white/5 transition-colors">
                Join Guest List
              </button>
            </Link>
          </div>
        )}

        {/* Promoter */}
        {event.promoter_name && (
          <div className="flex items-center justify-between py-4 border-t border-zinc-800/50">
            <div className="flex items-center gap-3">
              {event.promoter_photo ? (
                <img 
                  src={event.promoter_photo} 
                  alt={event.promoter_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <span className="text-sm">🎤</span>
                </div>
              )}
              <div>
                <p className="font-medium text-sm">{event.promoter_name}</p>
                {event.promoter_ig && (
                  <p className="text-xs text-zinc-500">@{event.promoter_ig}</p>
                )}
              </div>
            </div>
            {event.promoter_ig && (
              <a 
                href={`https://instagram.com/${event.promoter_ig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400"
              >
                Follow
              </a>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent pt-12">
        <Link href={packages.length > 0 ? `#packages` : `lumina://event/${event.id}?guestlist=true`}>
          <button className="w-full py-4 bg-white text-black font-bold rounded-2xl text-lg hover:bg-zinc-200 transition-colors">
            {getCTAText()}
          </button>
        </Link>
        <p className="text-center text-xs text-zinc-600 mt-3">
          Powered by <span className="text-zinc-400">Lumina</span>
        </p>
      </div>

      <div className="h-32" />
    </div>
  );
}
