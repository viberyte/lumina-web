'use client';

import { useState } from 'react';

export default function ClaimPage({ partner, events, token }: { partner: any; events: any[]; token: string }) {
  const [step, setStep] = useState(partner.isClaimed ? 'success' : 'preview');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClaim = async () => {
    if (!phone || phone.length < 10) { setError('Enter a valid phone'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/partner/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, phone }) });
      const data = await res.json();
      if (res.ok) setStep('success'); else setError(data.error || 'Error');
    } catch (e) { setError('Network error'); } finally { setLoading(false); }
  };

  const hero = partner.gallery?.[0] ? (partner.gallery[0].startsWith('/') ? 'https://lumina.viberyte.com' + partner.gallery[0] : partner.gallery[0]) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 300, overflow: 'hidden' }}>
        {hero ? <img src={hero} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #09090b 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', top: 20, left: 20 }}><span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2 }}>LUMINA</span></div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>
        {/* Name */}
        <div style={{ marginTop: -60, position: 'relative', zIndex: 10 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{partner.businessName}</h1>
          {partner.venueAddress ? <p style={{ fontSize: 14, color: '#71717a', margin: '4px 0' }}>{partner.venueAddress}</p> : null}
          {partner.instagram ? <a href={'https://instagram.com/' + partner.instagram} target='_blank' style={{ fontSize: 14, color: '#ec4899', textDecoration: 'none' }}>@{partner.instagram}</a> : null}
        </div>

        {/* Features */}
        <div style={{ marginTop: 32, padding: 20, borderRadius: 16, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: '#a78bfa' }}>Your page is live on Lumina</h2>
          <p style={{ fontSize: 14, color: '#d4d4d8', lineHeight: 1.6, margin: 0 }}>Instagram photos auto-populate your page. Your reels show in Recent Vibes. Post and manage events. Accept bookings. Get analytics. Shareable NightLinks for every event.</p>
        </div>

        {/* Events */}
        {events.length > 0 ? (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Your Events</h2>
            {events.map((ev: any) => (
              <div key={ev.id} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', marginBottom: 8 }}>
                {ev.image ? <img src={ev.image.startsWith('/') ? 'https://lumina.viberyte.com' + ev.image : ev.image} alt='' style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} /> : null}
                <div><div style={{ fontSize: 15, fontWeight: 600 }}>{ev.title}</div><div style={{ fontSize: 13, color: '#71717a' }}>{ev.genre}</div></div>
              </div>
            ))}
          </div>
        ) : null}

        {/* CTA */}
        {step === 'preview' ? (
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <button onClick={() => setStep('verify')} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>Claim This Page</button>
            <p style={{ fontSize: 13, color: '#52525b', marginTop: 12 }}>Free to claim</p>
          </div>
        ) : null}

        {step === 'verify' ? (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Verify ownership</h2>
            <p style={{ fontSize: 14, color: '#71717a', margin: '0 0 20px' }}>Enter your venue phone number.</p>
            <input type='tel' value={phone} onChange={(e) => setPhone(e.target.value)} placeholder='(555) 123-4567' style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            {error ? <p style={{ fontSize: 13, color: '#ef4444', marginTop: 8 }}>{error}</p> : null}
            <button onClick={handleClaim} disabled={loading} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: loading ? '#3f3f46' : 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', fontSize: 17, fontWeight: 700, marginTop: 16, cursor: 'pointer' }}>{loading ? 'Verifying...' : 'Verify and Claim'}</button>
          </div>
        ) : null}

        {step === 'success' ? (
          <div style={{ marginTop: 40, textAlign: 'center', padding: '32px 0' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Page Claimed!</h2>
            <p style={{ fontSize: 15, color: '#a1a1aa', margin: '0 0 24px' }}>Download Lumina to manage your events and bookings.</p>
            <a href='https://apps.apple.com/app/lumina-nightlife/id6738979697' style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 12, background: '#fff', color: '#000', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>Download Lumina</a>
          </div>
        ) : null}

        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}
