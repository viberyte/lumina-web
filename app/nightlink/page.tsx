import Link from 'next/link';
import MobileNav from '../landing/MobileNav';

export const metadata = {
  title: 'NightLink — Your Venue, One Link Away',
  description: 'NightLink gives restaurants, cafes, lounges and nightlife venues a shareable digital storefront.',
};

export default function NightLinkPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/3 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/3 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white">VIBERYTE</Link>
          <div className="hidden md:flex gap-10 items-center">
            <Link href="/nightlink" className="text-white text-sm">NightLink</Link>
            <Link href="/for-properties" className="text-gray-400 hover:text-white transition text-sm">For Properties</Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition text-sm">Contact</Link>
            <Link href="/partner/login" className="text-gray-400 hover:text-white transition text-sm">Partner Login</Link>
          </div>
          <MobileNav />
        </div>
      </nav>
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-6">NightLink for Venues</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-[1.08]">Your venue deserves more <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400">than a listing.</span></h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">NightLink is a shareable digital storefront for your restaurant, cafe, lounge or nightlife venue. Events, menus, photos, bookings and your full story — in one link your audience actually uses.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#claim" className="inline-flex items-center justify-center bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition">Claim Your NightLink</a>
            <Link href="/partner/login" className="inline-flex items-center justify-center border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition">Partner Login</Link>
          </div>
        </div>
      </section>
      <section className="relative py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-[2.5rem] p-3">
                <div className="w-64 h-[480px] bg-gradient-to-b from-gray-900 to-black rounded-[2rem] flex flex-col pt-8 px-4 overflow-hidden">
                  <div className="w-full h-24 bg-white/[0.06] rounded-xl mb-3 flex items-end p-3"><div><p className="text-white text-sm font-bold">Saint Lounge</p><p className="text-gray-500 text-[10px]">Lower East Side</p></div></div>
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 mb-2"><p className="text-violet-400 text-[9px] font-medium tracking-widest uppercase mb-1">Tonight</p><p className="text-white text-[11px] font-semibold">R and B Fridays with DJ Kenzo</p><p className="text-gray-500 text-[9px]">10 PM — 4 AM</p></div>
                  <div className="bg-white/[0.04] rounded-lg p-3 mb-2"><p className="text-gray-400 text-[9px] font-medium tracking-widest uppercase mb-1">Menu</p><div className="flex gap-2"><span className="text-[10px] text-gray-300 bg-white/[0.06] px-2 py-0.5 rounded">Cocktails</span><span className="text-[10px] text-gray-300 bg-white/[0.06] px-2 py-0.5 rounded">Bites</span><span className="text-[10px] text-gray-300 bg-white/[0.06] px-2 py-0.5 rounded">Bottles</span></div></div>
                  <div className="flex gap-1.5 mb-2"><div className="w-1/3 h-14 bg-white/[0.06] rounded-md"></div><div className="w-1/3 h-14 bg-white/[0.06] rounded-md"></div><div className="w-1/3 h-14 bg-white/[0.06] rounded-md"></div></div>
                  <div className="bg-white/[0.04] rounded-lg p-3 mb-2"><p className="text-gray-400 text-[9px] font-medium tracking-widest uppercase mb-1">VIP Packages</p><div className="flex justify-between items-center"><p className="text-white text-[10px]">Premium Table (6 guests)</p><p className="text-violet-400 text-[10px] font-semibold">$2,500</p></div></div>
                  <div className="bg-white rounded-lg py-2.5 text-center mt-auto mb-4"><p className="text-black text-[11px] font-semibold">Book / Request</p></div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">One page for everything happening at your venue.</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3"><svg className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><p className="text-gray-300 text-sm">Tonight and upcoming events with flyers, lineups and times</p></div>
                <div className="flex items-start gap-3"><svg className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><p className="text-gray-300 text-sm">Full menu — food, cocktails and bottles</p></div>
                <div className="flex items-start gap-3"><svg className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><p className="text-gray-300 text-sm">Photo gallery showing your space at its best</p></div>
                <div className="flex items-start gap-3"><svg className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><p className="text-gray-300 text-sm">VIP packages, bottle service and booking requests</p></div>
                <div className="flex items-start gap-3"><svg className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><p className="text-gray-300 text-sm">Instagram integration and direct messaging</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">More Than a Link</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Built for discovery.</h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto mb-4">NightLink gives venues a richer presence across the Viberyte ecosystem. Eligible venues may also be surfaced through curated discovery experiences, including Explore, Flows and participating properties.</p>
          <p className="text-gray-500 text-sm">Discovery placement is curated independently.</p>
        </div>
      </section>
      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16"><p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">Built For</p><h2 className="text-3xl md:text-4xl font-bold">Operators who take their presence seriously.</h2></div>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center"><p className="text-lg font-semibold mb-2">Restaurants</p><p className="text-gray-500 text-sm">Fine dining, casual, date-night spots</p></div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center"><p className="text-lg font-semibold mb-2">Cafes</p><p className="text-gray-500 text-sm">Coffee shops, brunch spots, dessert bars</p></div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center"><p className="text-lg font-semibold mb-2">Lounges</p><p className="text-gray-500 text-sm">Cocktail bars, rooftops, speakeasies</p></div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center"><p className="text-lg font-semibold mb-2">Nightclubs</p><p className="text-gray-500 text-sm">Bottle service, events, guest lists</p></div>
          </div>
        </div>
      </section>
      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-8">One plan. Everything included.</h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-10 max-w-md mx-auto">
            <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-2">NightLink</p>
            <p className="text-4xl font-bold mb-1">$25<span className="text-lg font-normal text-gray-400">/month</span></p>
            <p className="text-gray-500 text-sm mb-8">No commission on NightLink booking requests. Cancel anytime.</p>
            <div className="space-y-3 text-left text-sm text-gray-300">
              <div className="flex items-center gap-3"><svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><span>Digital storefront</span></div>
              <div className="flex items-center gap-3"><svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><span>Events</span></div>
              <div className="flex items-center gap-3"><svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><span>Menu</span></div>
              <div className="flex items-center gap-3"><svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><span>Gallery</span></div>
              <div className="flex items-center gap-3"><svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><span>Packages and booking requests</span></div>
              <div className="flex items-center gap-3"><svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><span>Shareable link</span></div>
              <div className="flex items-center gap-3"><svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><span>Analytics</span></div>
              <div className="flex items-center gap-3"><svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><span>Venue management</span></div>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-6">Early partners lock in founder pricing.</p>
        </div>
      </section>
      <section id="claim" className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">Get Started</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Claim your NightLink.</h2>
          <p className="text-gray-400 text-lg mb-10">Tell us about your venue and we will set up your NightLink page. Most venues are live within 48 hours.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:info@viberyte.com?subject=Claim%20My%20NightLink&body=Venue%20name%3A%20%0AVenue%20type%3A%20%0ACity%3A%20%0AInstagram%3A%20%0AYour%20name%3A%20%0A" className="inline-flex items-center justify-center bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition">Claim Your NightLink</a>
            <Link href="/partner/login" className="inline-flex items-center justify-center border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition">Partner Login</Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div><p className="text-white font-bold text-lg">VIBERYTE</p><p className="text-gray-500 text-sm mt-1">Curated discovery for dining, nightlife and experiences.</p></div>
          <div className="flex gap-8 text-sm text-gray-500"><Link href="/nightlink" className="hover:text-white transition">NightLink</Link><Link href="/for-properties" className="hover:text-white transition">For Properties</Link><Link href="/contact" className="hover:text-white transition">Contact</Link><Link href="/privacy" className="hover:text-white transition">Privacy</Link><Link href="/terms" className="hover:text-white transition">Terms</Link></div>
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} Viberyte LLC</p>
        </div>
      </footer>
    </div>
  );
}
