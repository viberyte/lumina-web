#!/bin/bash
echo "🎉 LUMINA MAIN EVENT SCRAPER"
echo "⏰ $(date)"
echo ""

cd /opt/viberyte/lumina-web

# Clean old events
echo "🗑️ Cleaning old events..."
sqlite3 data/lumina.db "DELETE FROM events WHERE date < date('now');"

echo ""
echo "=========================="
echo ""

# 1. DICE (402 events)
echo "🎲 DICE.fm..."
node scripts/scrapers/dice-scraper-fixed.js

echo ""
echo "=========================="
echo ""

# 2. POSH (555 events)
echo "💎 POSH.vip..."
node scripts/scrapers/posh-aggressive.js

echo ""
echo "=========================="
echo ""

# 3. Resident Advisor + KeemeatsB (804 events)
echo "🎵 Apify: Resident Advisor + KeemeatsB..."
node scripts/scrapers/apify-combined-importer.js

echo ""
echo "=========================="
echo ""

# 4. Venue Calendars (44 events)
echo "🏛️ Venue Calendars (Nebula, Somewhere Nowhere, etc)..."
node scripts/scrapers/all-events-scraper.js

echo ""
echo "=========================="
echo ""

# 5. Instagram Events (40 events)
echo "📸 Instagram/Apify text extractor..."
node scripts/scrapers/apify-text-extractor.js

echo ""
echo "=========================="
echo ""

# 6. TAO (20 events)
echo "🏮 TAO Group..."
node /opt/viberyte/lumina-telegram-bot/scripts/tao-events-scraper.js 2>/dev/null || echo "⚠️ TAO scraper unavailable"

echo ""
echo "=========================="
echo ""

# Final summary
echo "✅ SCRAPING COMPLETE!"
echo ""
sqlite3 data/lumina.db "SELECT COUNT(*) FROM events WHERE date >= date('now');" | xargs echo "📊 Total upcoming events:"
echo ""
echo "📊 Events by source:"
sqlite3 data/lumina.db "SELECT source_type, COUNT(*) FROM events WHERE date >= date('now') GROUP BY source_type ORDER BY COUNT(*) DESC;"
echo ""
echo "🎯 Expected totals:"
echo "   - DICE: ~400 events"
echo "   - POSH: ~550 events"
echo "   - Resident Advisor: ~770 events"
echo "   - KeemeatsB: ~30 events"
echo "   - Venue Calendars: ~45 events"
echo "   - Instagram/Apify: ~40 events"
echo "   - TAO: ~20 events"
echo "   ════════════════════════"
echo "   - TOTAL: ~1,900 events"
