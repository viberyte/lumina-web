import Link from 'next/link';

export const metadata = {
  title: 'Contact Us - Lumina',
  description: 'Get in touch with the Lumina team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold text-white">
            LUMINA
          </Link>
          <div className="hidden md:flex gap-10 items-center">
            <Link href="/for-business" className="text-gray-400 hover:text-white transition text-sm">For Business</Link>
            <Link href="/partner/login" className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-100 transition">Partner Login</Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-24">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Get in Touch</h1>
          <p className="text-gray-400 text-xl mb-12">
            Have questions about Lumina? Want to partner with us? We'd love to hear from you.
          </p>

          {/* Contact Card */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 mb-8">
            <div className="w-16 h-16 rounded-xl bg-violet-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Email Us</h2>
            <a 
              href="mailto:info@viberyte.com" 
              className="text-violet-400 text-xl hover:text-violet-300 transition"
            >
              info@viberyte.com
            </a>
            <p className="text-gray-500 mt-4 text-sm">We typically respond within 24 hours</p>
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-2 gap-4">
            <Link 
              href="/for-business" 
              className="bg-white/[0.03] border border-white/5 rounded-xl p-6 hover:bg-white/[0.05] transition text-left"
            >
              <h3 className="font-semibold mb-2">For Venues & Promoters</h3>
              <p className="text-gray-500 text-sm">Learn how Lumina can grow your business</p>
            </Link>
            <Link 
              href="/support" 
              className="bg-white/[0.03] border border-white/5 rounded-xl p-6 hover:bg-white/[0.05] transition text-left"
            >
              <h3 className="font-semibold mb-2">Support</h3>
              <p className="text-gray-500 text-sm">Get help with your account or bookings</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
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
