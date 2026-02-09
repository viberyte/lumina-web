'use client';
import { useState, useEffect, useCallback } from 'react';

const ADMIN_KEY = 'lumina-outreach-2026';
const API = '/api/admin/outreach';

const STATUS_COLORS: Record<string, string> = {
  none: '#6b7280', sent: '#f59e0b', opened: '#3b82f6', claimed: '#22c55e', active: '#10b981',
};

const DM_TEMPLATES: Record<string, string> = {
  initial: "Hey {name}! We built a free page for you on Lumina - it shows your vibe, photos, hours, and lets fans book tables directly.\n\nCheck it out: {url}\n\nClaim it for free to manage your events and bookings. No fees, you keep 100%",
  nightlife: "Hey {name}! We curated a page for you on Lumina - the nightlife concierge app.\n\nYour page: {url}\n\nIt already has your photos, hours, and vibe. Claim it free to add events, bottle service, and guest lists.",
  restaurant: "Hey {name}! We featured you on Lumina - the dining and nightlife discovery app.\n\nYour page: {url}\n\nIt shows your photos, hours, and vibe tags. Claim it free to promote specials and events.",
  followup: "Hey {name}! Just checking if you saw the page we built for you - {url}\n\nTakes 30 seconds to claim. Free event management + booking tools.",
};

export default function OutreachDashboard() {
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [partners, setPartners] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cities, setCities] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [templateType, setTemplateType] = useState('initial');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (filterCity) params.set('city', filterCity);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (search) params.set('search', search);
      const res = await fetch(API + '?' + params, { headers: { Authorization: 'Bearer ' + ADMIN_KEY } });
      const data = await res.json();
      setPartners(data.partners || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCities(data.cities || []);
      setStats(data.stats || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, filterCity, filterStatus, search]);

  useEffect(() => { if (authed) fetchData(); }, [authed, fetchData]);

  const updateStatus = async (id: number, status: string) => {
    await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ADMIN_KEY }, body: JSON.stringify({ id, outreach_status: status }) });
    setPartners(prev => prev.map(p => p.id === id ? { ...p, outreach_status: status } : p));
  };

  const copyDM = (partner: any) => {
    const msg = DM_TEMPLATES[templateType].replace(/{name}/g, partner.business_name).replace(/{url}/g, 'https://lumina.viberyte.com/partner/' + partner.id);
    navigator.clipboard.writeText(msg);
    setCopiedId(partner.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 40, width: 340, textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Lumina Outreach</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>Enter admin key</p>
          <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && keyInput === ADMIN_KEY) setAuthed(true); }} placeholder="Admin key" style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 16 }} />
          <button onClick={() => { if (keyInput === ADMIN_KEY) setAuthed(true); }} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Enter</button>
        </div>
      </div>
    );
  }

  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' as const }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</div>
    </div>
  );

  const PartnerRow = ({ p }: { p: any }) => {
    const isExpanded = expandedId === p.id;
    const isCopied = copiedId === p.id;
    const statusColor = STATUS_COLORS[p.outreach_status] || STATUS_COLORS.none;
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {p.image_url ? (
            <img src={p.image_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' as const, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>&#x1F3E2;</div>
          )}
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : p.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.business_name}</span>
              <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 100, background: statusColor + '22', color: statusColor, textTransform: 'uppercase' as const, flexShrink: 0 }}>{p.outreach_status || 'none'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.city}, {p.state} &middot; @{p.instagram_handle}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => copyDM(p)} style={{ padding: '8px 12px', background: isCopied ? 'rgba(34,197,94,0.2)' : 'rgba(139,92,246,0.1)', border: '1px solid ' + (isCopied ? 'rgba(34,197,94,0.3)' : 'rgba(139,92,246,0.3)'), borderRadius: 10, color: isCopied ? '#22c55e' : '#a78bfa', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>{isCopied ? 'Copied!' : 'Copy DM'}</button>
            <a href={'https://ig.me/m/' + p.instagram_handle} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>DM</a>
          </div>
        </div>
        {isExpanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' as const }}>
              <a href={'https://lumina.viberyte.com/partner/' + p.id} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, color: '#a78bfa', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>View Page</a>
              <a href={'https://instagram.com/' + p.instagram_handle} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Instagram</a>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['none', 'sent', 'opened', 'claimed'].map(s => (
                <button key={s} onClick={() => updateStatus(p.id, s)} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: 'pointer', textTransform: 'capitalize' as const, background: p.outreach_status === s ? STATUS_COLORS[s] + '22' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (p.outreach_status === s ? STATUS_COLORS[s] : 'rgba(255,255,255,0.08)'), color: p.outreach_status === s ? STATUS_COLORS[s] : 'rgba(255,255,255,0.3)' }}>{s}</button>
              ))}
            </div>
            {p.vibe_tags && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>Vibes: {p.vibe_tags}</div>}
            {p.music_genres && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Genres: {p.music_genres}</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: '-apple-system, sans-serif', padding: '20px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Outreach Dashboard</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 20 }}>{total} venues &middot; {stats.sent || 0} sent &middot; {stats.claimed || 0} claimed</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          <StatCard label="Pending" value={stats.pending || 0} color="#6b7280" />
          <StatCard label="Sent" value={stats.sent || 0} color="#f59e0b" />
          <StatCard label="Opened" value={stats.opened || 0} color="#3b82f6" />
          <StatCard label="Claimed" value={stats.claimed || 0} color="#22c55e" />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }} placeholder="Search venue or IG..." style={{ flex: 1, minWidth: 180, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }} />
          <select value={filterCity} onChange={e => { setFilterCity(e.target.value); setPage(1); }} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }}>
            <option value="">All Cities</option>
            {cities.map((c: any) => <option key={c.city} value={c.city}>{c.city}, {c.state} ({c.count})</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }}>
            <option value="all">All Status</option>
            <option value="none">Pending</option>
            <option value="sent">Sent</option>
            <option value="opened">Opened</option>
            <option value="claimed">Claimed</option>
          </select>
          <select value={templateType} onChange={e => setTemplateType(e.target.value)} style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, color: '#a78bfa', fontSize: 14, outline: 'none' }}>
            <option value="initial">Initial DM</option>
            <option value="nightlife">Nightlife DM</option>
            <option value="restaurant">Restaurant DM</option>
            <option value="followup">Follow-up DM</option>
          </select>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center' as const, padding: 40, color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {partners.map((p: any) => <PartnerRow key={p.id} p={p} />)}
          </div>
        )}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, paddingBottom: 40 }}>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: page === 1 ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: 14, fontWeight: 600, cursor: page === 1 ? 'default' : 'pointer' }}>Prev</button>
            <span style={{ padding: '10px 16px', fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{page} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: page === totalPages ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: 14, fontWeight: 600, cursor: page === totalPages ? 'default' : 'pointer' }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}