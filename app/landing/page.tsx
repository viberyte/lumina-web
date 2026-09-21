import Link from 'next/link';
import Image from 'next/image';
import MobileNav from './MobileNav';
import AnimatedSections from './AnimatedSections';

export const metadata = {
  title: 'Viberyte - AI-Powered Nightlife Concierge',
  description: 'Plan your entire night in seconds.',
};

const APP_STORE_URL = 'https://apps.apple.com/us/app/lumina-nightlife/id6756772075';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-purple-600/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold text-white">
            LUMINA
          </Link>
          <div className="hidden md:flex gap-10 items-center">
            <Link href="/for-business" className="text-gray-400 hover:text-white transition text-sm">For Venues</Link>
            <Link href="/promoters" className="text-gray-400 hover:text-white transition text-sm">For Promoters</Link>
            <a href={APP_STORE_URL} className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]">Download</a>
          </div>
          <MobileNav />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            Your night, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-500 to-pink-400 bg-[length:200%_200%] animate-gradient">curated.</span>
          </h1>
          <p className="text-gray-400 text-xl md:text-2xl mb-4 max-w-2xl mx-auto leading-relaxed">
            AI-powered nightlife concierge. Plan your entire night in seconds.
          </p>
          <p className="text-gray-500 text-sm mb-10">
            Trusted by nightlife lovers across NYC, New Jersey, Philly, and DC
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href={APP_STORE_URL}
              className="inline-flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              Download on iOS
            </a>
            <a 
              href="#how-it-works" 
              className="inline-flex items-center justify-center border border-gray-700 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition"
            >
              How It Works
            </a>
          </div>
        </div>

        {/* Hero Phone */}
        <div className="relative w-full max-w-sm mx-auto transition-transform duration-500 hover:-translate-y-2">
          <Image 
            src="/images/app/home.png" 
            alt="Viberyte App - Home Screen" 
            width={390}
            height={780}
            priority
            className="w-full h-auto drop-shadow-2xl"
          />
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-violet-400 font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Tell Viberyte your vibe</h3>
              <p className="text-gray-400 text-sm">Date night, group outing, solo adventure - just describe what you want.</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-400 font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Get curated spots</h3>
              <p className="text-gray-400 text-sm">AI-powered recommendations based on your preferences and real-time data.</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-pink-400 font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Go out confidently</h3>
              <p className="text-gray-400 text-sm">Book tables, get directions, and enjoy your perfectly planned night.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <AnimatedSections appStoreUrl={APP_STORE_URL} />

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-gray-500 text-sm">{new Date().getFullYear()} Viberyte by Viberyte</div>
          <div className="flex gap-8 text-gray-500 text-sm">
            <Link href="/support" className="hover:text-white transition">Support</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
