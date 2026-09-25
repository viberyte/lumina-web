import Link from 'next/link';
import MobileNav from './landing/MobileNav';

export const metadata = {
  title: 'Viberyte — Curated Discovery for Dining, Nightlife and Experiences',
  description: 'Less searching. Better options. Restaurants, lounges, nightlife and complete evening plans — selected for the moment, not buried in endless lists.',
};

const APP_STORE_URL = 'https://apps.apple.com/app/lumina-nightlife-concierge/id6738980729';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />

      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white">VIBERYTE</Link>
          <div className="hidden md:flex gap-10 items-center">
            <Link href="/nightlink" className="text-gray-400 hover:text-white transition text-sm">NightLink</Link>
            <Link href="/for-properties" className="text-gray-400 hover:text-white transition text-sm">For Properties</Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition text-sm">Contact</Link>
            <Link href="/partner/login" className="text-gray-400 hover:text-white transition text-sm">Partner Login</Link>
            <a href={APP_STORE_URL} className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]">Download</a>
          </div>
          <MobileNav />
        </div>
      </nav>

      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-40">
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-violet-900/20" />

        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-6">Dining. Nightlife. Experiences.</p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-[1.05]">
            Less searching.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400">Better options.</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Curated restaurants, lounges and nightlife — selected for the moment, not buried in endless lists.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={APP_STORE_URL} className="inline-flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              Download on iOS
            </a>
            <Link href="/for-properties" className="inline-flex items-center justify-center border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition">
              For Hotels and Properties
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="w-5 h-8 border-2 border-white/30 rounded-full flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-white/50 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">The Platform</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for discovery. Distributed where decisions happen.</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Three sides of the same experience.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:border-violet-500/30 transition-all duration-300">
              <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Discover</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Curated restaurants, cafes, cocktail bars, lounges and nightlife. Browse by mood or let Viberyte turn the night into a multi-stop Flow.
              </p>
              <a href={APP_STORE_URL} className="inline-flex items-center gap-2 text-violet-400 text-sm mt-5 hover:text-violet-300 transition">
                Get the app <span aria-hidden="true">&rarr;</span>
              </a>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:border-violet-500/30 transition-all duration-300">
              <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 3h13.5M5.25 21V10.5m0 0h13.5m-13.5 0V3" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">For Properties</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Hotels and residential buildings give guests instant access to curated local experiences through a QR-powered concierge. No app download required. Complimentary.
              </p>
              <Link href="/for-properties" className="inline-flex items-center gap-2 text-violet-400 text-sm mt-5 hover:text-violet-300 transition">
                Learn more <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:border-violet-500/30 transition-all duration-300">
              <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">NightLink</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Your venue deserves more than a listing. NightLink gives restaurants, lounges and nightlife venues a shareable digital storefront with events, menus and bookings.
              </p>
              <Link href="/nightlink" className="inline-flex items-center gap-2 text-violet-400 text-sm mt-5 hover:text-violet-300 transition">
                Claim yours <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The places worth knowing.</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">Every recommendation is selected for quality, relevance and the moment. Real places. Useful details. No endless directory.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="text-5xl font-bold text-white/10 mb-4">01</div>
              <h3 className="text-lg font-semibold mb-2">Pick your mood</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Date night, friends night, solo dinner, late-night cocktails — start with what you are looking for.</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white/10 mb-4">02</div>
              <h3 className="text-lg font-semibold mb-2">See what fits</h3>
              <p className="text-gray-500 text-sm leading-relaxed">A focused selection of venues chosen for the occasion. No filler, no dead ends, no outdated listings.</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white/10 mb-4">03</div>
              <h3 className="text-lg font-semibold mb-2">Plan the whole night</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Flows build your complete evening — dinner, drinks, after-hours — with timing and transitions already figured out.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">Available In</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">New York &middot; New Jersey &middot; Honolulu</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-12">Starting in select markets, with more cities coming soon.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Manhattan', 'Brooklyn', 'Queens', 'Harlem', 'Williamsburg', 'Lower East Side', 'North Jersey', 'Hoboken', 'Honolulu', 'Waikiki'].map(city => (
              <span key={city} className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-full text-sm text-gray-300">{city}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Stop scrolling. Start going.</h2>
          <p className="text-gray-400 text-lg mb-10">Download Viberyte and discover what is actually worth your night.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={APP_STORE_URL} className="inline-flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              Download on iOS
            </a>
            <Link href="/contact" className="inline-flex items-center justify-center border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-white font-bold text-lg">VIBERYTE</p>
            <p className="text-gray-500 text-sm mt-1">Curated discovery for dining, nightlife and experiences.</p>
          </div>
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
