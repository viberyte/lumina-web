import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

// Supabase client for fetching plans
const SUPABASE_URL = 'https://ovlnxzbkvbgcnguqvxhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bG54emJrdmJnY25ndXF2eGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTAzNzQsImV4cCI6MjA4MzU4NjM3NH0.lJVpPf-quU6_8F0wpa3goIppmcQgSb3Yc95w0d8F9TM';

interface Plan {
  id: string;
  name: string;
  emoji: string;
  date: string | null;
  is_tonight: boolean;
  share_code: string;
}

interface PlanItem {
  id: string;
  venue_name: string;
  venue_photo: string | null;
  venue_category: string | null;
  venue_neighborhood: string | null;
  venue_rating: number | null;
  venue_price_range: string | null;
  sort_order: number;
}

async function getPlan(shareCode: string): Promise<{ plan: Plan; items: PlanItem[] } | null> {
  try {
    console.log('Fetching plan with share code:', shareCode);
    
    // Fetch plan
    const planRes = await fetch(
      `${SUPABASE_URL}/rest/v1/plans?share_code=eq.${shareCode}&is_public=eq.true&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: 'no-store',
      }
    );
    
    if (!planRes.ok) {
      console.error('Plan fetch failed:', planRes.status, await planRes.text());
      return null;
    }
    
    const plans = await planRes.json();
    console.log('Plans response:', plans);
    
    if (!Array.isArray(plans) || plans.length === 0) {
      console.log('No plan found for share code:', shareCode);
      return null;
    }
    
    const plan = plans[0];
    
    // Fetch items
    const itemsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/plan_items?plan_id=eq.${plan.id}&select=*&order=sort_order.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: 'no-store',
      }
    );
    
    let items: PlanItem[] = [];
    if (itemsRes.ok) {
      const itemsData = await itemsRes.json();
      if (Array.isArray(itemsData)) {
        items = itemsData;
      }
    }
    
    console.log('Plan items:', items.length);
    
    return { plan, items };
  } catch (error) {
    console.error('Error fetching plan:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { shareCode: string } }): Promise<Metadata> {
  const data = await getPlan(params.shareCode);
  
  if (!data) {
    return { title: 'Plan Not Found | Lumina' };
  }
  
  const { plan, items } = data;
  const stopCount = items.length;
  const description = `${stopCount} ${stopCount === 1 ? 'stop' : 'stops'} planned${plan.is_tonight ? ' for tonight' : ''}`;
  
  return {
    title: `${plan.emoji} ${plan.name} | Lumina`,
    description,
    openGraph: {
      title: `${plan.emoji} ${plan.name}`,
      description,
      url: `https://lumina.viberyte.com/plan/${params.shareCode}`,
      images: items[0]?.venue_photo ? [items[0].venue_photo] : [],
      siteName: 'Lumina',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${plan.emoji} ${plan.name}`,
      description,
    },
  };
}

function formatDate(dateStr: string | null, isTonight: boolean): string {
  if (isTonight) return 'Tonight';
  if (!dateStr) return 'No date set';
  
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default async function SharedPlanPage({ params }: { params: { shareCode: string } }) {
  const data = await getPlan(params.shareCode);
  
  if (!data) {
    notFound();
  }
  
  const { plan, items } = data;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0F] to-[#1a1a2e]">
      {/* Header */}
      <header className="pt-12 pb-8 px-6 text-center">
        <Link href="/" className="text-purple-500 text-sm font-semibold tracking-widest uppercase mb-6 block">
          LUMINA
        </Link>
        <div className="text-5xl mb-4">{plan.emoji || '✨'}</div>
        <h1 className="text-3xl font-bold text-white mb-2">{plan.name}</h1>
        <p className="text-gray-400">
          {items.length} {items.length === 1 ? 'stop' : 'stops'} planned
        </p>
        <div className="inline-flex items-center gap-2 bg-purple-500/15 text-purple-400 px-4 py-2 rounded-full mt-4 text-sm font-medium">
          <span>📅</span>
          <span>{formatDate(plan.date, plan.is_tonight)}</span>
        </div>
      </header>
      
      {/* Venues */}
      <main className="px-6 pb-32 max-w-lg mx-auto">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          The Flow
        </h2>
        
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No venues added yet</p>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id}>
                <div className="bg-[#16161F] rounded-2xl overflow-hidden border border-[#2A2A3A]">
                  {item.venue_photo && (
                    <img 
                      src={item.venue_photo} 
                      alt={item.venue_name}
                      className="w-full h-44 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-white">{item.venue_name}</h3>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {item.venue_category && `${item.venue_category} • `}
                      {item.venue_neighborhood || ''}
                      {item.venue_price_range && ` • ${item.venue_price_range}`}
                    </p>
                    {item.venue_rating && (
                      <div className="flex items-center gap-1 mt-2 text-sm">
                        <span className="text-yellow-500">★</span>
                        <span className="text-gray-400">{item.venue_rating}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Flow connector */}
                {index < items.length - 1 && (
                  <div className="flex items-center justify-center gap-2 py-2 text-gray-600 text-xs">
                    <span className="text-purple-500">↓</span>
                    <span>then</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F] to-transparent">
        <a 
          href="https://apps.apple.com/app/lumina"
          className="block w-full max-w-lg mx-auto bg-gradient-to-r from-purple-500 to-purple-700 text-white text-center py-4 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform"
        >
          Get Lumina - Plan Your Night
        </a>
      </div>
    </div>
  );
}
