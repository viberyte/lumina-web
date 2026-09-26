'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RequestQRPage() {
  const [form, setForm] = useState({
    propertyName: '', propertyType: 'hotel', address: '', city: '', state: '',
    contactName: '', contactEmail: '', contactPhone: '', contactTitle: '', numRooms: '', notes: ''
  });
  const [status, setStatus] = useState('idle');

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const submit = async () => {
    if (!form.propertyName || !form.contactName || !form.contactEmail) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/property-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch(e) { setStatus('error'); }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Request received.</h1>
          <p className="text-gray-400 text-lg mb-8">Thank you. We will build your guest experience page and be in touch within 48 hours.</p>
          <Link href="/" className="text-violet-400 hover:text-violet-300 transition">Back to Viberyte</Link>
        </div>
      </div>
    );
  }

  const ic = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 transition";

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]" />
      </div>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white">VIBERYTE</Link>
          <div className="hidden md:flex gap-10 items-center">
            <Link href="/nightlink" className="text-gray-400 hover:text-white transition text-sm">NightLink</Link>
            <Link href="/for-properties" className="text-gray-400 hover:text-white transition text-sm">For Properties</Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition text-sm">Contact</Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">For Properties</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Request your QR cards.</h1>
            <p className="text-gray-400 text-lg">Tell us about your property. We will build your guest experience page and ship branded QR cards within a week. Complimentary.</p>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Property name <span className="text-violet-400">*</span></label>
              <input value={form.propertyName} onChange={e => update('propertyName', e.target.value)} placeholder="e.g. The Ludlow Hotel" className={ic} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Property type</label>
                <select value={form.propertyType} onChange={e => update('propertyType', e.target.value)} className={ic}>
                  <option value="hotel">Hotel</option>
                  <option value="boutique_hotel">Boutique Hotel</option>
                  <option value="residential">Luxury Residential</option>
                  <option value="co_living">Co-Living</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Number of rooms / units</label>
                <input value={form.numRooms} onChange={e => update('numRooms', e.target.value)} placeholder="e.g. 120" className={ic} />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Property address</label>
              <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="e.g. 180 Ludlow St" className={ic} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">City</label>
                <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="e.g. New York" className={ic} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">State</label>
                <input value={form.state} onChange={e => update('state', e.target.value)} placeholder="e.g. NY" className={ic} />
              </div>
            </div>

            <hr className="border-white/[0.06] my-2" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Your name <span className="text-violet-400">*</span></label>
                <input value={form.contactName} onChange={e => update('contactName', e.target.value)} placeholder="e.g. Sarah Chen" className={ic} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Your title</label>
                <input value={form.contactTitle} onChange={e => update('contactTitle', e.target.value)} placeholder="e.g. General Manager" className={ic} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Email <span className="text-violet-400">*</span></label>
                <input value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)} type="email" placeholder="e.g. sarah@theludlow.com" className={ic} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Phone</label>
                <input value={form.contactPhone} onChange={e => update('contactPhone', e.target.value)} type="tel" placeholder="e.g. (212) 555-0100" className={ic} />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Anything else we should know</label>
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} placeholder="Existing local partnerships, special requests, timeline..." className={ic + " resize-none"} />
            </div>

            <button
              onClick={submit}
              disabled={status === 'sending' || !form.propertyName || !form.contactName || !form.contactEmail}
              className="w-full bg-white text-black py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'sending' ? 'Submitting...' : 'Request QR Cards'}
            </button>

            {status === 'error' && <p className="text-red-400 text-sm text-center">Something went wrong. Please try again or email info@viberyte.com directly.</p>}

            <p className="text-gray-600 text-xs text-center">By submitting, you agree to be contacted by Viberyte about your property. No spam, ever.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div><p className="text-white font-bold text-lg">VIBERYTE</p><p className="text-gray-500 text-sm mt-1">Curated discovery for dining, nightlife and experiences.</p></div>
          <div className="flex gap-8 text-sm text-gray-500"><Link href="/nightlink" className="hover:text-white transition">NightLink</Link><Link href="/for-properties" className="hover:text-white transition">For Properties</Link><Link href="/contact" className="hover:text-white transition">Contact</Link></div>
          <p className="text-gray-600 text-xs">\u00A9 {new Date().getFullYear()} Viberyte LLC</p>
        </div>
      </footer>
    </div>
  );
}