import Database from 'better-sqlite3';

export function expandRecurringEvents(db: Database.Database, filters: { city?: string; genre?: string; search?: string }) {
  const recurringEvents = db.prepare(`
    SELECT 
      pe.id, pe.title as name, pe.description,
      pe.event_date as date, pe.event_time as time,
      pe.genre as music_genre, pe.image_url, pe.packages,
      pe.guest_list_enabled, pe.guest_list_price, pe.slug,
      pe.boost_level, pe.event_fingerprint, pe.lineup,
      pe.door_time, pe.dress_code, pe.age_restriction,
      pe.ticket_url, pe.event_category, pe.special_tags, pe.price_note,
      COALESCE(pe.venue_name_cache, pv.name) as venue_name,
      COALESCE(pv.address, '') as venue_address,
      COALESCE(pe.city, pv.city, '') as city,
      pe.venue_id, pe.recurrence_days, pe.recurrence_type,
      p.id as partner_id, p.business_name as partner_name,
      p.instagram_handle as partner_instagram,
      p.profile_picture as partner_photo,
      1 as hasBookingOptions, 'partner' as source,
      NULL as crowd_type, NULL as peak_hours, NULL as why_recommended
    FROM partner_events pe
    LEFT JOIN partner_venues pv ON pe.venue_id = pv.id
    LEFT JOIN partners p ON pe.partner_id = p.id
    WHERE pe.status = 'published'
      AND pe.on_explore = 1
      AND pe.is_demo = 0
      AND pe.is_recurring = 1
      AND (pe.recurrence_end_date IS NULL OR pe.recurrence_end_date >= date('now'))
  `).all() as any[];

  const virtualInstances: any[] = [];
  const today = new Date();
  const twoWeeksOut = new Date(today);
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

  for (const re of recurringEvents) {
    let days: number[] = [];
    try { days = JSON.parse(re.recurrence_days || '[]'); } catch { continue; }
    if (days.length === 0) continue;

    // Apply filters
    if (filters.city && !(re.city || '').toLowerCase().includes(filters.city.toLowerCase())) continue;
    if (filters.genre && !(re.music_genre || '').toLowerCase().includes(filters.genre.toLowerCase())) continue;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!(re.name || '').toLowerCase().includes(s) && !(re.venue_name || '').toLowerCase().includes(s)) continue;
    }

    // Generate instances for matching days in next 14 days
    const cursor = new Date(today);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= twoWeeksOut) {
      const dayOfWeek = cursor.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
      if (days.includes(dayOfWeek)) {
        const dateStr = cursor.toISOString().split('T')[0];
        virtualInstances.push({
          ...re,
          id: re.id,
          date: dateStr,
          _virtualId: re.id + '_' + dateStr,
          _isRecurringInstance: true,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return virtualInstances;
}
