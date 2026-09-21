'use client';

import { useState } from 'react';

interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  bottleCount?: number;
  maxGuests?: number;
  sectionId?: string;
}

interface EventData {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  genre: string | null;
  image_url: string | null;
  guest_list_enabled: number;
  guest_list_price: number;
  packages: string | null;
  sections: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_instagram: string | null;
  promoter_name: string | null;
  promoter_ig: string | null;
  promoter_photo: string | null;
  partner_id: number | null;
  payment_venmo: string | null;
  payment_zelle: string | null;
  payment_cashapp: string | null;
  is_demo: number;
  is_claimed: number;
  claim_token: string | null;
}

function parsePackages(json: string | null): Package[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter(p => p?.name && typeof p.price === 'number') : [];
  } catch { return []; }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}${m > 0 ? ':' + String(m).padStart(2, '0') : ''} ${ampm}`;
  } catch { return timeStr; }
}

export default function NightLinkClient({ event }: { event: EventData }) {
  const packages = parsePackages(event.packages);
  const genres = event.genre?.split(',').map(g => g.trim()).filter(Boolean) || [];

  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', partySize: '2', instagram: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formType, setFormType] = useState<'table' | 'guestlist'>('table');

  // Claim state
  const isUnclaimed = event.is_demo === 1 || event.is_claimed === 0;
  const claimUrl = event.claim_token ? `/claim/${event.claim_token}` : null;
  const [showBenefits, setShowBenefits] = useState(false);

  const handleReserve = (pkg: Package) => {
    setSelectedPkg(pkg);
    setFormType('table');
    setShowForm(true);
    setTimeout(() => document.getElementById('reserve-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleGuestList = () => {
    setSelectedPkg(null);
    setFormType('guestlist');
    setShowForm(true);
    setTimeout(() => document.getElementById('reserve-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/nightlink/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          packageId: selectedPkg?.id || null,
          packageName: selectedPkg?.name || null,
          packagePrice: selectedPkg?.price || 0,
          type: formType,
          name: formData.name,
          phone: formData.phone,
          partySize: parseInt(formData.partySize) || 2,
          instagram: formData.instagram,
          notes: formData.notes,
        }),
      });
      if (res.ok) setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const APP_STORE_URL = 'https://apps.apple.com/us/app/lumina-nightlife/id6756772075';

  const benefits = [
    { icon: '📱', text: 'Shareable event pages like this one' },
    { icon: '🍾', text: 'Sell bottles & guest list directly' },
    { icon: '💬', text: 'Chat with guests before they arrive' },
    { icon: '📊', text: 'Track bookings & revenue in real-time' },
    { icon: '✅', text: 'Keep 100% — no platform fees' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

      {/* CLAIM BANNER — Only shows for unclaimed/demo events */}
      {isUnclaimed && claimUrl && (
        <div style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 100,
          background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
        }}>
          {/* Main banner */}
          <div style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span style={{ fontSize: '18px' }}>✨</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#fff' }}>This is YOUR page</p>
                <p style={{ fontSize: '12px', margin: '2px 0 0', color: 'rgba(255,255,255,0.85)' }}>Claim it to start accepting bookings</p>
              </div>
            </div>
            <a 
              href={claimUrl}
              style={{ 
                padding: '10px 20px', 
                background: '#fff', 
                color: '#000', 
                borderRadius: '100px', 
                fontWeight: 700, 
                fontSize: '13px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              Claim Now
            </a>
          </div>
          
          {/* See what you get toggle */}
          <button 
            onClick={() => setShowBenefits(!showBenefits)}
            style={{
              width: '100%',
              padding: '10px 20px',
              background: 'rgba(0,0,0,0.15)',
              border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {showBenefits ? 'Hide' : 'See what you get'} 
            <span style={{ 
              transform: showBenefits ? 'rotate(180deg)' : 'rotate(0deg)', 
              transition: 'transform 0.2s ease',
              fontSize: '10px'
            }}>▼</span>
          </button>

          {/* Benefits dropdown */}
          {showBenefits && (
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              padding: '16px 20px 20px',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {benefits.map((benefit, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{benefit.icon}</span>
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{benefit.text}</span>
                  </div>
                ))}
              </div>
              <a 
                href={claimUrl}
                style={{
                  display: 'block',
                  marginTop: '16px',
                  padding: '14px',
                  background: '#fff',
                  color: '#000',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  textAlign: 'center',
                  textDecoration: 'none'
                }}
              >
                Claim Your Page — It's Free
              </a>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: '10px' }}>
                Verify with Instagram in seconds
              </p>
            </div>
          )}
        </div>
      )}

      {/* HERO */}
      <div style={{ position: 'relative', width: '100%', height: event.image_url ? '85vh' : '50vh', maxHeight: '700px', overflow: 'hidden' }}>
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.3) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 32px' }}>
          {genres.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {genres.slice(0, 3).map(g => (
                <span key={g} style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.08)' }}>{g}</span>
              ))}
            </div>
          )}
          <h1 style={{ fontSize: 'clamp(32px, 8vw, 52px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 16px' }}>{event.title}</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
              {formatDate(event.event_date)}
              {event.event_time && <span style={{ color: 'rgba(255,255,255,0.5)' }}> · {formatTime(event.event_time)}</span>}
              {event.end_time && <span style={{ color: 'rgba(255,255,255,0.5)' }}> – {formatTime(event.end_time)}</span>}
            </p>
            {event.venue_name && (
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                {event.venue_name}{event.venue_address && <span> · {event.venue_address}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ padding: '32px 24px 200px', maxWidth: '560px', margin: '0 auto' }}>

        {event.description && (
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', margin: '0 0 40px', letterSpacing: '0.01em' }}>{event.description}</p>
        )}

        {/* TABLE PACKAGES */}
        {packages.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '4px', height: '20px', background: 'linear-gradient(to bottom, #fff, rgba(255,255,255,0.2))', borderRadius: '2px' }} />
              <h2 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Reserve a Table</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {packages.map((pkg, i) => (
                <div key={pkg.id || i} onClick={() => handleReserve(pkg)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>{pkg.name}</h3>
                      {pkg.description && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{pkg.description}</p>}
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                      <p style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>${pkg.price.toLocaleString()}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>minimum</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                    {pkg.bottleCount && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>🍾 {pkg.bottleCount} bottle{pkg.bottleCount > 1 ? 's' : ''}</span>}
                    {pkg.maxGuests && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>👥 Up to {pkg.maxGuests} guests</span>}
                  </div>
                  <div style={{ marginTop: '20px', padding: '14px', textAlign: 'center', background: '#fff', color: '#000', borderRadius: '14px', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>Reserve Now</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GUEST LIST */}
        {event.guest_list_enabled === 1 && (
          <div onClick={handleGuestList} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '40px', cursor: 'pointer', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 4px' }}>Guest List</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Skip the line · Priority entry</p>
              </div>
              <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{event.guest_list_price > 0 ? `$${event.guest_list_price}` : 'Free'}</p>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '14px', fontWeight: 600, fontSize: '14px', color: '#fff' }}>Join Guest List</div>
          </div>
        )}

        {/* RESERVATION FORM */}
        {showForm && !submitted && (
          <div id="reserve-form" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '28px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px' }}>
              {formType === 'table' ? `Reserve: ${selectedPkg?.name}` : 'Join Guest List'}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 24px' }}>
              {formType === 'table' ? `$${selectedPkg?.price?.toLocaleString()} minimum` : 'Get on the list'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input type="text" placeholder="Your name *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '16px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
              <input type="tel" placeholder="Phone number *" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '16px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <select value={formData.partySize} onChange={e => setFormData({ ...formData, partySize: e.target.value })} style={{ flex: 1, padding: '16px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', fontSize: '15px', outline: 'none', appearance: 'none' }}>
                  {[1,2,3,4,5,6,8,10,12,15,20].map(n => (
                    <option key={n} value={n} style={{ background: '#111' }}>{n} guest{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
                <input type="text" placeholder="@ Instagram" value={formData.instagram} onChange={e => setFormData({ ...formData, instagram: e.target.value })} style={{ flex: 1, padding: '16px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', fontSize: '15px', outline: 'none' }} />
              </div>
              <input type="text" placeholder="Any notes (optional)" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ width: '100%', padding: '16px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleSubmit} disabled={submitting || !formData.name || !formData.phone} style={{ width: '100%', marginTop: '20px', padding: '18px', background: (!formData.name || !formData.phone) ? 'rgba(255,255,255,0.1)' : '#fff', color: (!formData.name || !formData.phone) ? 'rgba(255,255,255,0.3)' : '#000', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '16px', cursor: (!formData.name || !formData.phone) ? 'not-allowed' : 'pointer', letterSpacing: '-0.01em', transition: 'all 0.2s ease' }}>
              {submitting ? 'Sending...' : formType === 'table' ? 'Request This Table' : 'Submit'}
            </button>
          </div>
        )}

        {/* SUCCESS */}
        {submitted && (
          <div id="reserve-form" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '24px', padding: '32px', marginBottom: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>Request Sent</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
              {formType === 'table' ? `Your request for ${selectedPkg?.name} has been sent. You'll receive a confirmation shortly.` : "You're on the guest list. You'll receive a confirmation shortly."}
            </p>
          </div>
        )}

        {/* PROMOTER */}
        {event.promoter_name && (
          <a href={event.partner_id ? `/partner/${event.partner_id}` : '#'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', overflow: 'hidden' }}>
                {event.promoter_photo ? (
                  <img src={event.promoter_photo} alt={event.promoter_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  '🎧'
                )}
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{event.promoter_name}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>Host</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>View profile</span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>›</span>
            </div>
          </a>
        )}

        {/* TRUST BAR */}
        <div style={{ padding: '24px 0', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {event.venue_address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14px', opacity: 0.4 }}>📍</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{event.venue_address}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', opacity: 0.4 }}>🕐</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Doors {formatTime(event.event_time) || '10 PM'}
              {event.end_time && ` – ${formatTime(event.end_time)}`}
            </span>
          </div>
        </div>

        {/* APP STORE BANNER */}
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px 24px', marginTop: '8px', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0, background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>L</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 2px', fontWeight: 500 }}>Get the full experience</p>
            <p style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#fff' }}>Viberyte Nightlife</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>Discover venues · Plan your night</p>
          </div>
          <div style={{ padding: '8px 18px', background: '#fff', borderRadius: '100px', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#000' }}>GET</span>
          </div>
        </a>

        {/* POWERED BY */}
        <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', margin: 0 }}>POWERED BY</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', margin: '4px 0 0' }}>LUMINA</p>
        </div>
      </div>

      {/* FIXED BOTTOM CTA */}
      {!showForm && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px 28px', background: 'linear-gradient(to top, #000 60%, transparent)', zIndex: 50 }}>
          <button onClick={() => packages.length > 0 ? handleReserve(packages[0]) : handleGuestList()} style={{ width: '100%', padding: '18px', background: '#fff', color: '#000', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '17px', cursor: 'pointer', letterSpacing: '-0.02em' }}>
            {packages.length > 0 ? 'Reserve a Table' : event.guest_list_enabled ? 'Join Guest List' : 'Contact Host'}
          </button>
        </div>
      )}
    </div>
  );
}
