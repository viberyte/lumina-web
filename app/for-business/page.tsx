import Link from 'next/link';
import Image from 'next/image';
import InstagramFlowSection from './InstagramFlowSection';

export const metadata = {
  title: 'Viberyte for Business - Venues & Promoters',
  description: 'Grow your nightlife business with Viberyte. Table management, bookings, and payments.',
};

const APP_STORE_URL = 'https://apps.apple.com/app/lumina';
const PARTNER_SIGNUP_URL = '/partner';

export default function ForBusinessPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold text-white">
            LUMINA
          </Link>
          <div className="hidden md:flex gap-10 items-center">
            <Link href="/landing" className="text-gray-400 hover:text-white transition text-sm">For Consumers</Link>
            <Link href="/for-business" className="text-white text-sm">For Business</Link>
            <a href={PARTNER_SIGNUP_URL} className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]">Get Started</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <div className="inline-block px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm font-medium mb-6">
            For Venues and Promoters
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            Fill tables. <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-500 to-pink-400">Get paid.</span>
          </h1>
          <p className="text-gray-400 text-xl md:text-2xl mb-4 max-w-2xl mx-auto leading-relaxed">
            The all-in-one platform for nightlife professionals. Manage bookings, collect payments, and grow your business.
          </p>
          <p className="text-gray-500 text-sm mb-10">
            Built for managers, hosts, promoters, and owners
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href={PARTNER_SIGNUP_URL}
              className="inline-flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Booking Tonight
            </a>
            <a 
              href="#features" 
              className="inline-flex items-center justify-center border border-gray-700 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition"
            >
              See Features
            </a>
          </div>
        </div>

        {/* Hero Image - Dashboard */}
        <div className="relative w-full max-w-4xl mx-auto transition-transform duration-500 hover:-translate-y-2">
          <Image 
            src="/images/partner/dashboard.png" 
            alt="Viberyte Partner Dashboard" 
            width={1200}
            height={800}
            priority
            className="w-full h-auto drop-shadow-2xl rounded-xl"
          />
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Who It's For */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Built for nightlife professionals</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 hover:bg-white/[0.05] transition">
              <div className="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Venues</h3>
              <p className="text-gray-400 leading-relaxed">
                Manage your floor plan, track reservations, and maximize table revenue. Get real-time insights into your busiest nights.
              </p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 hover:bg-white/[0.05] transition">
              <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Promoters</h3>
              <p className="text-gray-400 leading-relaxed">
                Build your brand, manage guest lists, and get paid for every booking. Track your performance across multiple venues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Why Viberyte Wins - Before/After */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-10">Why teams switch to Viberyte</h3>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h4 className="font-semibold mb-2">Before Viberyte</h4>
              <p className="text-gray-500 text-sm">DMs, spreadsheets, missed payments, no-shows</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-semibold mb-2">With Viberyte</h4>
              <p className="text-gray-400 text-sm">Centralized bookings, automated payments, deposit protection</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 className="font-semibold mb-2">The Result</h4>
              <p className="text-gray-400 text-sm">More filled tables, fewer no-shows, faster payouts</p>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}

      {/* Instagram Auto-Import Feature */}
      <InstagramFlowSection />

      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Features */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything you need to run your night</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">From table setup to payment collection, Viberyte handles the heavy lifting.</p>
          </div>

          {/* Feature 1 - Table Setup */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
            <div className="order-2 lg:order-1">
              <div className="inline-block px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm font-medium mb-6">
                Floor Management
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Visual table layout builder</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                Create your exact floor plan with our drag-and-drop builder. Set minimum spends, capacity limits, and pricing tiers for each section.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Drag-and-drop table placement
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Custom pricing per section
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Real-time availability updates
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="transition-transform duration-500 hover:-translate-y-2">
                <Image 
                  src="/images/partner/table-setup.png" 
                  alt="Viberyte Table Setup" 
                  width={500}
                  height={600}
                  className="w-full max-w-md drop-shadow-2xl rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Feature 2 - Booking Management */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
            <div className="flex justify-center">
              <div className="transition-transform duration-500 hover:-translate-y-2">
                <Image 
                  src="/images/partner/booking.png" 
                  alt="Viberyte Booking Management" 
                  width={500}
                  height={600}
                  className="w-full max-w-md drop-shadow-2xl rounded-xl"
                />
              </div>
            </div>
            <div>
              <div className="inline-block px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-medium mb-6">
                Bookings
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Manage all reservations in one place</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                See every booking at a glance. Track confirmations, deposits, and special requests. Never lose a reservation again.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Instant booking notifications
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Deposits reduce no-shows
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Guest history and preferences
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3 - Split Payments */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-block px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-6">
                Payments
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Flexible payment collection</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                Let guests pay how they want. Split bills between the group, collect deposits upfront, or take full payment at arrival.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Split payments between guests
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Payment required to confirm
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  Automatic payment reminders
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="transition-transform duration-500 hover:-translate-y-2">
                <Image 
                  src="/images/partner/split-payment.png" 
                  alt="Viberyte Split Payments" 
                  width={500}
                  height={600}
                  className="w-full max-w-md drop-shadow-2xl rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Payment Methods */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Accept payments your way</h2>
          <p className="text-gray-400 text-lg mb-12">Let guests pay however they prefer. We support all major payment methods.</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.05] transition">
              <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Card</h3>
              <p className="text-gray-500 text-sm">Visa, Mastercard, Amex</p>
            </div>

            {/* Cash App */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.05] transition">
              <div className="w-16 h-16 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.59 3.47A5.1 5.1 0 0 0 20.54.42 7.13 7.13 0 0 0 19.09 0c-1.09 0-2.19.33-3.21.98L12 3.41 8.12.98A5.9 5.9 0 0 0 4.91 0c-.41 0-.82.04-1.21.12A5.1 5.1 0 0 0 .41 3.47a5.1 5.1 0 0 0 .41 4.19l3.88 5.34-3.88 5.34a5.1 5.1 0 0 0-.41 4.19 5.1 5.1 0 0 0 3.29 3.05c.39.08.8.12 1.21.12 1.09 0 2.19-.33 3.21-.98L12 20.59l3.88 2.43a5.9 5.9 0 0 0 3.21.98c.41 0 .82-.04 1.21-.12a5.1 5.1 0 0 0 3.29-3.05 5.1 5.1 0 0 0-.41-4.19L19.3 11.3l3.88-5.34a5.1 5.1 0 0 0 .41-4.19zM12 14.12L9.09 12 12 9.88 14.91 12 12 14.12z"/>
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Cash App</h3>
              <p className="text-gray-500 text-sm">Instant transfers</p>
            </div>

            {/* Zelle */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.05] transition">
              <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.559 24h-2.841a.483.483 0 0 1-.483-.483v-5.155H5.493a.483.483 0 0 1-.369-.793l9.058-10.825a.483.483 0 0 1 .852.312v5.155h4.742a.483.483 0 0 1 .369.793L11.087 23.83a.483.483 0 0 1-.369.17h-1.159z"/>
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Zelle</h3>
              <p className="text-gray-500 text-sm">Bank transfers</p>
            </div>

            {/* Cash */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.05] transition">
              <div className="w-16 h-16 rounded-xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Cash at Door</h3>
              <p className="text-gray-500 text-sm">Pay on arrival</p>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Keep 100% of your P2P payments. No per-reservation cuts. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Claimed - Free */}
            <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800">
              <h3 className="text-xl font-semibold text-white mb-2">Claimed</h3>
              <p className="text-gray-500 text-sm mb-6">Get discovered</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">Free</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Claim your venue
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Edit venue profile
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Post basic events
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Get discovered
                </li>
              </ul>
              <a href="/partner?tier=claimed" className="block w-full text-center py-3 rounded-xl border border-zinc-700 text-white font-medium hover:bg-zinc-800 transition">
                Get Started
              </a>
            </div>

            {/* Spotlight - $25/mo */}
            <div className="bg-zinc-900/50 rounded-2xl p-8 border border-blue-500/30">
              <h3 className="text-xl font-semibold text-white mb-2">Spotlight</h3>
              <p className="text-gray-500 text-sm mb-6">Grow your presence</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$25</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Everything in Free
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Event promotion boost
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Happy Hour placement
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Daily Specials placement
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Continue the Night flow
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Basic analytics
                </li>
              </ul>
              <a href="/partner?tier=spotlight" className="block w-full text-center py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition">
                Start Free Trial
              </a>
            </div>

            {/* Elite - $44.99/mo */}
            <div className="bg-gradient-to-b from-violet-500/10 to-transparent rounded-2xl p-8 border border-violet-500/30 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-500 text-white text-xs font-medium rounded-full">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Elite</h3>
              <p className="text-gray-500 text-sm mb-6">Full booking system</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$44.99</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Everything in Spotlight
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Table bookings
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Accept payments
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  VIP section management
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Advanced analytics
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Priority placement
                </li>
              </ul>
              <a href="/partner?tier=elite" className="block w-full text-center py-3 rounded-xl bg-violet-500 text-white font-medium hover:bg-violet-600 transition">
                Start Free Trial
              </a>
            </div>
          </div>

          {/* Value Props */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">24/7</div>
              <div className="text-gray-500 mt-2 text-sm">Support</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">14 day</div>
              <div className="text-gray-500 mt-2 text-sm">Free trial</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">100%</div>
              <div className="text-gray-500 mt-2 text-sm">P2P payments yours</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">1000+</div>
              <div className="text-gray-500 mt-2 text-sm">Venues trust us</div>
            </div>
          </div>
        </div>
      </section>
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Testimonial */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <svg className="w-10 h-10 text-violet-500/30 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
          </svg>
          <p className="text-xl md:text-2xl text-gray-300 italic mb-6 leading-relaxed">
            "Viberyte helped us streamline bookings and eliminate payment confusion on busy weekends. Our no-show rate dropped significantly."
          </p>
          <div className="text-gray-500">NYC Lounge Manager</div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* CTA */}
      <section className="relative z-10 py-24 px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to grow your business?</h2>
        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">Start your free trial today. No credit card required.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href={'/partner'}
            className="inline-flex items-center gap-3 bg-white text-black px-10 py-5 rounded-full font-semibold text-lg hover:bg-gray-100 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            I'm a Venue
          </a>
          <a 
            href={'/partner'}
            className="inline-flex items-center gap-3 border border-gray-700 text-white px-10 py-5 rounded-full font-semibold text-lg hover:bg-white/5 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            I'm a Promoter
          </a>
        </div>
      </section>

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
