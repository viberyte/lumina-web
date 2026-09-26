import Link from 'next/link';
import MobileNav from '../landing/MobileNav';

export const metadata = {
  title: 'Viberyte for Properties — Guest Discovery, Powered by You',
  description: 'Give your guests and residents a better answer to What should we do tonight? Free QR-powered concierge for hotels and luxury residential buildings.',
};

export default function ForPropertiesPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white">VIBERYTE</Link>
          <div className="hidden md:flex gap-10 items-center">
            <Link href="/nightlink" className="text-gray-400 hover:text-white transition text-sm">NightLink</Link>
            <Link href="/for-properties" className="text-white text-sm">For Properties</Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition text-sm">Contact</Link>
            <Link href="/partner/login" className="text-gray-400 hover:text-white transition text-sm">Partner Login</Link>
          </div>
          <MobileNav />
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-6">Viberyte for Properties</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-[1.08]">
            Give guests a better answer to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400">{'"'}What should we do tonight?{'"'}</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            A complimentary digital concierge for hotels, boutique properties and luxury residential buildings. Guests scan a QR code and instantly access curated dining, nightlife and experiences nearby. No app download required.
          </p>
          <a href="/request-qr" className="inline-flex items-center justify-center bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]">
            Get Your Complimentary Guest Page
          </a>
        </div>
      </section>

      <section className="relative py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Your property. Their city. One scan away.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center">
              <div className="rounded-2xl overflow-hidden inline-block shadow-2xl shadow-violet-500/10">
                <img src="/images/qr-card-hotel.png" alt="Viberyte QR card on a hotel front desk" className="w-72 h-auto" />
              </div>
              <p className="text-gray-500 text-sm mt-4">Branded QR card at your front desk</p>
            </div>
            <div className="hidden md:flex justify-center">
              <svg className="w-16 h-16 text-violet-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
            <div className="text-center">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-[2.5rem] p-3 inline-block">
                <div className="w-56 h-96 bg-gradient-to-b from-gray-900 to-black rounded-[2rem] flex flex-col items-center pt-10 px-5 overflow-hidden">
                  <p className="text-violet-400 text-[10px] font-medium tracking-widest uppercase mb-1">Viberyte</p>
                  <p className="text-white text-sm font-semibold mb-1">Welcome from</p>
                  <p className="text-white text-lg font-bold mb-4">The Ludlow Hotel</p>
                  <div className="w-full space-y-2">
                    <div className="bg-white/[0.06] rounded-lg p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-violet-500/20 rounded-md"></div><div><p className="text-white text-[11px] font-medium">Date Night</p><p className="text-gray-500 text-[9px]">3 stops nearby</p></div></div></div>
                    <div className="bg-white/[0.06] rounded-lg p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-pink-500/20 rounded-md"></div><div><p className="text-white text-[11px] font-medium">Late Night</p><p className="text-gray-500 text-[9px]">Cocktails and after-hours</p></div></div></div>
                    <div className="bg-white/[0.06] rounded-lg p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-500/20 rounded-md"></div><div><p className="text-white text-[11px] font-medium">Dinner</p><p className="text-gray-500 text-[9px]">Curated restaurants nearby</p></div></div></div>
                  </div>
                </div>
              </div>
              <p className="text-gray-500 text-sm mt-4">Guest experience — no download needed</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold">Three steps. Zero integration.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5"><span className="text-2xl font-bold text-violet-400">1</span></div>
              <h3 className="text-lg font-semibold mb-3">We build your page</h3>
              <p className="text-gray-500 text-sm leading-relaxed">A branded guest experience page with curated restaurants, lounges, nightlife and events near your property. Your name, your neighborhood, your guests.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5"><span className="text-2xl font-bold text-violet-400">2</span></div>
              <h3 className="text-lg font-semibold mb-3">Place the QR card</h3>
              <p className="text-gray-500 text-sm leading-relaxed">We send you a set of branded QR cards. Place them at the front desk, in rooms, or at the concierge. Guests scan and browse instantly.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5"><span className="text-2xl font-bold text-violet-400">3</span></div>
              <h3 className="text-lg font-semibold mb-3">Guests discover</h3>
              <p className="text-gray-500 text-sm leading-relaxed">No app download. No login. Guests see curated options immediately — restaurants, date-night spots, cocktail bars, late-night venues, and complete evening plans.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">The Guest Experience</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Hospitality beyond the lobby.</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Your guests arrive in a new city with zero local knowledge. Viberyte gives them exactly what they need in seconds.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8"><h3 className="text-lg font-semibold mb-3">Curated by neighborhood</h3><p className="text-gray-400 text-sm leading-relaxed">Guests see the best dining and nightlife within walking distance or a short ride from your property. Not the entire city — just what is relevant.</p></div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8"><h3 className="text-lg font-semibold mb-3">Complete evening plans</h3><p className="text-gray-400 text-sm leading-relaxed">Flows build multi-stop itineraries — dinner, drinks and what comes next — giving guests another way to explore beyond a single recommendation.</p></div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8"><h3 className="text-lg font-semibold mb-3">No app required</h3><p className="text-gray-400 text-sm leading-relaxed">The guest experience runs entirely in the browser. Scan, browse, go. No download friction, no account creation, no barriers.</p></div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8"><h3 className="text-lg font-semibold mb-3">Fresh recommendations</h3><p className="text-gray-400 text-sm leading-relaxed">Viberyte keeps the local experience updated, so guests are not relying on printed guides or outdated neighborhood lists.</p></div>
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">Your Relationships, Included</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Already recommend local spots? Bring them with you.</h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto">Already partner with nearby restaurants, cafes or nightlife venues? Let us know. Viberyte can incorporate your preferred local recommendations alongside our curated discovery experience. Your neighborhood relationships become part of the digital concierge.</p>
        </div>
      </section>

      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">Built For</p>
            <h2 className="text-3xl md:text-4xl font-bold">Properties that care about the guest experience.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/[0.04] rounded-xl flex items-center justify-center mx-auto mb-4"><svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 3h13.5M5.25 21V10.5m0 0h13.5m-13.5 0V3" /></svg></div>
              <h3 className="text-lg font-semibold mb-2">Boutique Hotels</h3>
              <p className="text-gray-500 text-sm">Elevate the stay with a concierge experience that reflects your standards.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/[0.04] rounded-xl flex items-center justify-center mx-auto mb-4"><svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg></div>
              <h3 className="text-lg font-semibold mb-2">Luxury Residential</h3>
              <p className="text-gray-500 text-sm">A resident amenity that makes your building feel more connected to the neighborhood.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/[0.04] rounded-xl flex items-center justify-center mx-auto mb-4"><svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" /></svg></div>
              <h3 className="text-lg font-semibold mb-2">Full-Service Hotels</h3>
              <p className="text-gray-500 text-sm">Replace printed guides and outdated binders with something guests actually use.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Complimentary for properties.</h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto mb-8">No subscription. No integration fee. No contract. Viberyte provides the guest experience and QR materials at no cost to participating properties.</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-300">
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Branded guest experience page</span>
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Physical QR cards shipped</span>
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Curated local discovery</span>
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Automatic updates</span>
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>Guest engagement analytics</span>
          </div>
        </div>
      </section>

      <section id="get-started" className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">Get Started</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Bring Viberyte to your property.</h2>
          <p className="text-gray-400 text-lg mb-10">Tell us about your hotel or residential community. We will create a complimentary guest experience for your location.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:info@viberyte.com?subject=Viberyte%20for%20our%20property&body=Property%20name%3A%20%0AProperty%20type%20(hotel%2Fresidential)%3A%20%0ACity%3A%20%0AYour%20name%3A%20%0A" className="inline-flex items-center justify-center bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]">Get Started</a>
            <a href="mailto:info@viberyte.com?subject=Request%20QR%20Cards&body=Property%20name%3A%20%0AAddress%3A%20%0AHow%20many%20QR%20cards%3A%20%0A" className="inline-flex items-center justify-center border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition">Request QR Cards</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div><p className="text-white font-bold text-lg">VIBERYTE</p><p className="text-gray-500 text-sm mt-1">Curated discovery for dining, nightlife and experiences.</p></div>
          <div className="flex gap-8 text-sm text-gray-500">
            <Link href="/nightlink" className="hover:text-white transition">NightLink</Link>
            <Link href="/for-properties" className="hover:text-white transition">For Properties</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
          </div>
          <p className="text-gray-600 text-xs">&copy; {new Date().getFullYear()} Viberyte LLC</p>
        </div>
      </footer>
    </div>
  );
}
