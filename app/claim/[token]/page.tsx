'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [partner, setPartner] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('owner');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch('/api/partner/claim?token=' + token)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          if (data.partner) setPartner(data.partner);
        } else {
          setPartner(data.partner);
        }
        setLoading(false);
      })
      .catch(() => { setError('Something went wrong'); setLoading(false); });
  }, [token]);

  const handleClaim = async () => {
    if (!name || !email || !password) { setError('Please fill in all required fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/partner/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, email, password, phone, role })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSubmitting(false); return; }
      router.push('/claim/success?name=' + encodeURIComponent(partner.business_name) + '&id=' + data.partnerId + '&token=' + data.token);
    } catch (e) { setError('Something went wrong'); setSubmitting(false); }
  };

  const inputStyle = { width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 12 };
  const labelStyle = { fontSize: 12, fontWeight: 600 as const, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'block' };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>Loading...</div>
    </div>
  );

  if (error === 'Already claimed') return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#x2705;</div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{partner?.business_name || 'This page'}</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 24 }}>This page has already been claimed. If this is your venue, log in to manage it.</p>
        <a href="https://apps.apple.com/app/lumina-nightlife/id6739197728" style={{ display: 'inline-block', padding: '14px 32px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Open Viberyte App</a>
      </div>
    </div>
  );

  if (error && !partner) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#x26A0;&#xFE0F;</div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Invalid Link</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: '-apple-system, sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' as const, letterSpacing: '2px', marginBottom: 8 }}>LUMINA</div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>Claim Your Page</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, margin: 0 }}>Set up your account to manage your venue</p>
        </div>

        {/* Venue Preview */}
        {partner && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            {partner.image_url ? (
              <img src={partner.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' as const }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>&#x1F3E2;</div>
            )}
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{partner.business_name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{partner.city}, {partner.state} {partner.instagram_handle ? ' \u00B7 @' + partner.instagram_handle : ''}</div>
            </div>
          </div>
        )}

        {/* Form */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Your Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" style={inputStyle} />

          <label style={labelStyle}>Email *</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@venue.com" style={inputStyle} />

          <label style={labelStyle}>Password *</label>
          <div style={{ position: 'relative' as const, marginBottom: 12 }}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" style={{ ...inputStyle, marginBottom: 0, paddingRight: 50 }} />
            <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute' as const, right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>

          <label style={labelStyle}>Phone (optional)</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" style={inputStyle} />

          <label style={labelStyle}>Your Role</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['owner', 'manager', 'promoter'].map(r => (
              <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: '10px', background: role === r ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (role === r ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'), borderRadius: 10, color: role === r ? '#a78bfa' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' as const }}>{r}</button>
            ))}
          </div>
        </div>

        {error && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <button onClick={handleClaim} disabled={submitting} style={{ width: '100%', padding: '16px', background: submitting ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', marginBottom: 16 }}>{submitting ? 'Claiming...' : 'Claim This Page'}</button>

        <p style={{ textAlign: 'center' as const, fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>By claiming, you confirm you are authorized to manage this venue. These credentials will be your login for the Viberyte app.</p>

        {/* Features */}
        <div style={{ marginTop: 32, padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: 12 }}>What you get</div>
          {['Event management & promotion', 'Bottle service & table bookings', 'Guest list management', 'Analytics dashboard', 'Direct messaging with customers', 'Instagram auto-sync'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#22c55e', fontSize: 14 }}>&#x2713;</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{f}</span>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginTop: 12, textAlign: 'center' as const }}>100% free to claim &middot; 0% platform fees</div>
        </div>
      </div>
    </div>
  );
}