import { notFound } from 'next/navigation';
import Database from 'better-sqlite3';
import Link from 'next/link';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

async function getPromoter(handle: string) {
  const promoter = db.prepare(`
    SELECT * FROM partners 
    WHERE instagram_handle = ? AND status = 'approved'
  `).get(handle.toLowerCase()) as any;

  return promoter;
}

async function getPromoterEvents(promoterId: number) {
  const events = db.prepare(`
    SELECT pe.*, pv.name as venue_name
    FROM partner_events pe
    LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
    WHERE pe.partner_id = ? AND pe.status = 'published'
    ORDER BY pe.event_date DESC
  `).all(promoterId) as any[];

  return events;
}

export async function generateMetadata({ params }: { params: { handle: string } }) {
  const promoter = await getPromoter(params.handle);
  if (!promoter) return { title: 'Not Found' };

  return {
    title: `${promoter.business_name || promoter.instagram_handle} | Lumina`,
    description: `Book events with ${promoter.business_name || promoter.instagram_handle}`,
    openGraph: {
      title: promoter.business_name || promoter.instagram_handle,
      images: promoter.profile_picture ? [promoter.profile_picture] : [],
    },
  };
}

export default async function PromoterProfilePage({ params }: { params: { handle: string } }) {
  const promoter = await getPromoter(params.handle);
  if (!promoter) notFound();

  const events = await getPromoterEvents(promoter.id);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.event_date) < new Date());

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Profile Header */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-b from-zinc-800 to-black" />
        
        <div className="px-6 -mt-12">
          {/* Avatar */}
          {promoter.profile_picture ? (
            <img 
              src={promoter.profile_picture} 
              alt={promoter.business_name || promoter.instagram_handle}
              className="w-24 h-24 rounded-full border-4 border-black object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-black bg-zinc-800 flex items-center justify-center">
              <span className="text-3xl">🎤</span>
            </div>
          )}

          {/* Name & Handle */}
          <div className="mt-4">
            <h1 className="text-2xl font-bold">
              {promoter.business_name || promoter.instagram_handle}
            </h1>
            {promoter.instagram_handle && (
              <a 
                href={`https://instagram.com/${promoter.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-blue-400 transition-colors"
              >
                @{promoter.instagram_handle}
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            {promoter.follower_count > 0 && (
              <div>
                <span className="font-semibold text-white">
                  {promoter.follower_count >= 1000 
                    ? `${(promoter.follower_count / 1000).toFixed(1)}k` 
                    : promoter.follower_count}
                </span>
                <span className="text-zinc-500 ml-1">followers</span>
              </div>
            )}
            <div>
              <span className="font-semibold text-white">{events.length}</span>
              <span className="text-zinc-500 ml-1">events</span>
            </div>
          </div>

          {/* Genre Tags */}
          {promoter.primary_genre && (
            <div className="flex items-center gap-2 mt-4">
              <span className="px-3 py-1 text-xs font-medium bg-white/10 rounded-full">
                {promoter.primary_genre}
              </span>
              {promoter.secondary_genres && promoter.secondary_genres.split(',').slice(0, 2).map((g: string) => (
                <span key={g} className="px-3 py-1 text-xs font-medium bg-white/5 rounded-full text-zinc-400">
                  {g.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Follow Button */}
          {promoter.instagram_handle && (
            <a 
              href={`https://instagram.com/${promoter.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Follow on Instagram
            </a>
          )}
        </div>
      </div>

      {/* Events */}
      <div className="px-6 py-8">
        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
              Upcoming Events
            </h2>
            <div className="space-y-3">
              {upcomingEvents.map((event: any) => (
                <Link key={event.id} href={`/e/${event.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${event.id}`}>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-4">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center">
                          <span className="text-2xl">🎵</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{event.title}</h3>
                        <p className="text-sm text-zinc-500 mt-1">{event.venue_name}</p>
                        <p className="text-sm text-zinc-400 mt-1">{formatDate(event.event_date)} · {event.event_time || '10pm'}</p>
                      </div>
                      <div className="text-zinc-600">
                        →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
              Past Events
            </h2>
            <div className="space-y-2">
              {pastEvents.slice(0, 5).map((event: any) => (
                <Link key={event.id} href={`/e/${event.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${event.id}`}>
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors -mx-2 px-2 rounded-lg">
                    <div>
                      <p className="text-white">{event.title}</p>
                      <p className="text-sm text-zinc-600">{formatDate(event.event_date)}</p>
                    </div>
                    <span className="text-zinc-700">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500">No events yet</p>
            <p className="text-zinc-600 text-sm mt-2">Check back soon</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-8 border-t border-zinc-800/50">
        <p className="text-center text-xs text-zinc-600">
          Powered by <span className="text-zinc-400">Lumina</span>
        </p>
      </div>
    </div>
  );
}
