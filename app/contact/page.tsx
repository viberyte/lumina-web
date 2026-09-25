import Link from 'next/link';
import MobileNav from '../landing/MobileNav';

export const metadata = {
  title: 'Contact — Viberyte',
  description: 'Get in touch with the Viberyte team. Hotels, venues, partnerships and general inquiries.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]" />
      </div>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white">VIBERYTE</Link>
          <div className="hidden md:flex gap-10 items-center">
            <Link href="/nightlink" className="text-gray-400 hover:text-white transition text-sm">NightLink</Link>
            <Link href="/for-properties" className="text-gray-400 hover:text-white transition text-sm">For Properties</Link>
            <Link href="/contact" className="text-white text-sm">Contact</Link>
            <Link href="/partner/login" className="text-gray-400 hover:text-white transition text-sm">Partner Login</Link>
          </div>
          <MobileNav />
        </div>
      </nav>
      <section className="relative pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-6">Contact</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Get in touch.</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">Whether you are a hotel, a venue, or just curious — we would love to hear from you.</p>
        </div>
      </section>
      <section className="relative pb-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:border-violet-500/30 transition-all duration-300">
            <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 3h13.5M5.25 21V10.5m0 0h13.5m-13.5 0V3" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Hotels and Properties</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">Interested in bringing Viberyte to your hotel, boutique property or residential building? We will build your guest experience page and ship QR cards at no cost.</p>
            <a href="mailto:info@viberyte.com?subject=Viberyte%20for%20our%20property&body=Property%20name%3A%20%0AProperty%20type%3A%20%0ACity%3A%20%0AYour%20name%3A%20%0A" className="inline-flex items-center gap-2 text-violet-400 text-sm hover:text-violet-300 transition">Get started <span aria-hidden="true">&rarr;</span></a>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:border-violet-500/30 transition-all duration-300">
            <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Venues</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">Run a restaurant, cafe, lounge or nightclub? Claim your NightLink page and manage your events, menu and bookings in one place.</p>
            <a href="mailto:info@viberyte.com?subject=Claim%20My%20NightLink&body=Venue%20name%3A%20%0AVenue%20type%3A%20%0ACity%3A%20%0AInstagram%3A%20%0AYour%20name%3A%20%0A" className="inline-flex items-center gap-2 text-violet-400 text-sm hover:text-violet-300 transition">Claim your NightLink <span aria-hidden="true">&rarr;</span></a>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:border-violet-500/30 transition-all duration-300">
            <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">General Inquiries</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">Questions about Viberyte, partnerships, press, or anything else? We are happy to talk.</p>
            <a href="mailto:info@viberyte.com?subject=General%20Inquiry" className="inline-flex items-center gap-2 text-violet-400 text-sm hover:text-violet-300 transition">Email us <span aria-hidden="true">&rarr;</span></a>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:border-violet-500/30 transition-all duration-300">
            <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Support</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">Need help with the app, your NightLink page, or your property experience? We are here.</p>
            <a href="mailto:info@viberyte.com?subject=Support%20Request" className="inline-flex items-center gap-2 text-violet-400 text-sm hover:text-violet-300 transition">Get help <span aria-hidden="true">&rarr;</span></a>
          </div>
        </div>
      </section>
      <section className="relative py-16 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gray-400 text-sm mb-2">Reach us directly</p>
          <a href="mailto:info@viberyte.com" className="text-white text-lg font-semibold hover:text-violet-400 transition">info@viberyte.com</a>
          <div className="flex justify-center gap-6 mt-6">
            <a href="https://instagram.com/viberyte" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition text-sm">Instagram</a>
            <a href="https://tiktok.com/@viberyte" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition text-sm">TikTok</a>
            <a href="https://linkedin.com/company/viberyte" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition text-sm">LinkedIn</a>
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
