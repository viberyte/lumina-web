/**
 * Event Fingerprint System
 * 
 * Generates a deterministic hash for event identity.
 * Used to deduplicate scraped vs partner events.
 * 
 * fingerprint = normalize(title) + normalize(venue) + date + city
 */

function normalize(str: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    // Remove common noise words
    .replace(/\b(official|the|a|an|at|presents?|featuring|feat\.?|ft\.?|w\/|with)\b/g, '')
    // Remove emojis
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    // Remove special characters except spaces and hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCity(city: string | null): string {
  if (!city) return '';
  const c = city.toLowerCase().trim();
  
  // NYC aliases
  if (['manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', 'nyc', 'new york city', 'new york'].includes(c)) {
    return 'newyork';
  }
  // Jersey aliases
  if (['jersey city', 'north jersey', 'south jersey', 'hoboken', 'newark'].includes(c)) {
    return 'newjersey';
  }
  // DC aliases
  if (['washington dc', 'washington d.c.', 'dc', 'd.c.'].includes(c)) {
    return 'dc';
  }
  // Philly aliases
  if (['philadelphia', 'philly'].includes(c)) {
    return 'philadelphia';
  }
  
  return c.replace(/[^a-z0-9]/g, '');
}

function normalizeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    // Handle various formats
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export function generateFingerprint(
  title: string | null,
  venueName: string | null,
  eventDate: string | null,
  city: string | null
): string {
  const parts = [
    normalize(title),
    normalize(venueName),
    normalizeDate(eventDate),
    normalizeCity(city),
  ].filter(Boolean);
  
  // Simple hash - not crypto, just consistent identity
  const raw = parts.join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Return readable prefix + hash for debugging
  const prefix = normalize(title)?.substring(0, 20).replace(/\s/g, '-') || 'unknown';
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}

export { normalize, normalizeCity, normalizeDate };
