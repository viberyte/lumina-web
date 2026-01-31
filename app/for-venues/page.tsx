import Link from 'next/link';

export const metadata = {
  title: 'For Venues & Promoters - Lumina',
  description: 'Grow your venue with Lumina. Table bookings, guest lists, and event promotion.',
};

export default function ForVenuesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold text-white">LUMINA</Link>
          <div className="hidden md:flex gap-10 items-center">
            <Link href="/for-venues" className="text-white text-sm font-medium">For Venues</Link>
            <Link href="/promoters" className="text-gray-400 hover:text-white transition text-sm">For Promoters</Link>
            <Link href="/partner" className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-100 transition">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm font-medium mb-6">
            For Venues & Promoters
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Fill your venue with the <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-500">right crowd</span>
          </h1>
          <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto">
            Table bookings, guest lists, event promotion, and more. Keep 100% of your P2P payments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/partner" className="inline-flex items-center justify-center bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition">
              Start Free Trial
            </Link>
            <a href="#pricing" className="inline-flex items-center justify-center border border-gray-700 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition">
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Everything you need to grow</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-zinc-900/50 rounded-2xl p-8">
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Table Bookings</h3>
              <p className="text-gray-400">Accept reservations and manage your floor. VIP sections, bottle service, and more.</p>
            </div>
            <div className="bg-zinc-900/50 rounded-2xl p-8">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Guest Lists</h3>
              <p className="text-gray-400">Manage your door efficiently. Track RSVPs, check-ins, and capacity in real-time.</p>
            </div>
            <div className="bg-zinc-900/50 rounded-2xl p-8">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Analytics</h3>
              <p className="text-gray-400">See what's working. Track bookings, revenue, and customer insights.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 border-t border-white/5">
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
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Claim your venue
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Edit venue profile
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Post basic events
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Get discovered
                </li>
              </ul>
              <Link href="/partner" className="block w-full text-center py-3 rounded-xl border border-zinc-700 text-white font-medium hover:bg-zinc-800 transition">
                Get Started
              </Link>
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
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Everything in Free
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Event promotion boost
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Happy Hour placement
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Daily Specials placement
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Continue the Night flow
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Basic analytics
                </li>
              </ul>
              <Link href="/partner" className="block w-full text-center py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition">
                Start Free Trial
              </Link>
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
                  <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Everything in Spotlight
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Table bookings
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Accept payments
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  VIP section management
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Advanced analytics
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Priority placement
                </li>
              </ul>
              <Link href="/partner" className="block w-full text-center py-3 rounded-xl bg-violet-500 text-white font-medium hover:bg-violet-600 transition">
                Start Free Trial
              </Link>
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

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to grow your venue?</h2>
        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">Join hundreds of venues already using Lumina to fill their tables.</p>
        <Link href="/partner" className="inline-flex items-center bg-white text-black px-10 py-5 rounded-full font-semibold text-lg hover:bg-gray-100 transition">
          Start Your Free Trial
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-gray-500 text-sm">{new Date().getFullYear()} Lumina by Viberyte</div>
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
