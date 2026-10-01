'use client';

import { useEffect, useState, useCallback } from 'react';
import { WelcomeData, Venue } from './types';
import { t } from './tokens';
import PropertyHeader from './components/PropertyHeader';
import ContextHero from './components/ContextHero';
import FeaturedPick from './components/FeaturedPick';
import MoodSelector from './components/MoodSelector';
import VenueRail from './components/VenueRail';
import FlowRail from './components/FlowRail';
import AppHandoff from './components/AppHandoff';
import VenueSheet from './components/VenueSheet';
import NightTray from './components/NightTray';

interface SavedVenue { id: number; name: string; image: string; }

export default function WelcomeClient({ slug }: { slug: string }) {
  const [data, setData] = useState<WelcomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const [intentResults, setIntentResults] = useState<Venue[]>([]);
  const [sheetVenue, setSheetVenue] = useState<number | null>(null);
  const [savedNight, setSavedNight] = useState<SavedVenue[]>([]);

  useEffect(() => {
    fetch(`/api/welcome?slug=${slug}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  const handleMood = useCallback(async (key: string) => {
    if (activeIntent === key) { setActiveIntent(null); setIntentResults([]); return; }
    setActiveIntent(key);
    const r = await fetch(`/api/welcome?slug=${slug}&intent=${key}`);
    const d = await r.json();
    setIntentResults(d.intentResults || []);
  }, [slug, activeIntent]);

  const openVenue = useCallback((id: number) => setSheetVenue(id), []);
  const closeSheet = useCallback(() => setSheetVenue(null), []);
  
  const saveToNight = useCallback((v: SavedVenue) => {
    setSavedNight(prev => {
      if (prev.find(s => s.id === v.id)) return prev;
      return [...prev, v];
    });
  }, []);

  const removeFromNight = useCallback((id: number) => {
    setSavedNight(prev => prev.filter(v => v.id !== id));
  }, []);

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: t.color.bg,
    }}>
      <div style={{ fontSize: 12, letterSpacing: 4, color: t.color.textMuted }}>VIBERYTE</div>
      <div style={{
        width: 20, height: 20, marginTop: 16,
        border: `2px solid ${t.color.accentDim}`, borderTopColor: t.color.accent,
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!data) return null;

  const { property, time, moodChips, hero, pick, flows, nearby, rails } = data;

  return (
    <div style={{
      minHeight: '100vh', background: t.color.bg, color: t.color.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      maxWidth: 430, margin: '0 auto',
      paddingBottom: savedNight.length > 0 ? 80 : 0,
    }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } ::-webkit-scrollbar { display: none; } body { background: ${t.color.bg}; }`}</style>

      <PropertyHeader name={property.name} neighborhood={property.neighborhood} timeStr={time.timeStr} dayName={time.dayName} />
      <ContextHero venue={hero} greeting={time.greeting} propertyName={property.name} neighborhood={property.neighborhood} />

      <FeaturedPick venue={pick} onTap={openVenue} />

      <MoodSelector chips={moodChips} active={activeIntent} onSelect={handleMood} />

      {activeIntent && intentResults.length > 0 && (
        <VenueRail
          title={moodChips.find(c => c.key === activeIntent)?.label || ''}
          subtitle="Based on your mood"
          venues={intentResults}
          onTapVenue={openVenue}
        />
      )}

      <FlowRail flows={flows} />

      {nearby.length > 0 && (
        <VenueRail
          title={`Walk from ${property.name.split(' ').slice(0, 2).join(' ')}`}
          subtitle="Under 15 minutes"
          venues={nearby}
          onTapVenue={openVenue}
        />
      )}

      {rails.map((rail, i) => (
        <VenueRail key={i} title={rail.title} subtitle={rail.subtitle} venues={rail.venues} onTapVenue={openVenue} />
      ))}

      <AppHandoff />

      <VenueSheet venueId={sheetVenue} slug={slug} onClose={closeSheet} onSave={saveToNight} />
      <NightTray saved={savedNight} onRemove={removeFromNight} onClear={() => setSavedNight([])} />
    </div>
  );
}
