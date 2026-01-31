#!/bin/bash

echo "=== VENUE BACKEND READINESS CHECK ==="

echo ""
echo "1. DATABASE - What We Have:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
  'Total Venues' as metric, COUNT(*) as value FROM venues WHERE should_exclude = 0
UNION ALL
SELECT 'With AI Tags', COUNT(*) FROM venues WHERE enhancement_version = 'lumina-v2-master-schema'
UNION ALL
SELECT 'With Instagram', COUNT(*) FROM venues WHERE instagram_handle IS NOT NULL
UNION ALL
SELECT 'With Crowd Photos', COUNT(DISTINCT venue_id) FROM crowd_photos
UNION ALL
SELECT 'Total Crowd Photos', COUNT(*) FROM crowd_photos
UNION ALL
SELECT 'With Events', COUNT(DISTINCT venue_id) FROM events;
SQL

echo ""
echo "2. API ENDPOINTS - What Exists:"
echo "Checking existing routes..."
if [ -f "/opt/viberyte/lumina-web/app/api/venues/route.ts" ]; then
  echo "  ✅ /api/venues exists"
else
  echo "  ❌ /api/venues missing"
fi

if [ -f "/opt/viberyte/lumina-web/app/api/events/route.ts" ]; then
  echo "  ✅ /api/events exists"
else
  echo "  ❌ /api/events missing"
fi

echo ""
echo "3. SAMPLE VENUE DATA:"
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
.mode json
SELECT 
  id, name, cuisine_primary, cuisine_style, 
  energy_level, instagram_handle, website
FROM venues 
WHERE should_exclude = 0
LIMIT 1;
SQL

echo ""
echo "4. STRIPE STATUS:"
echo "Checking for Stripe config..."
grep -r "STRIPE" /opt/viberyte/lumina-web/.env 2>/dev/null | head -3 || echo "  Need to check Stripe keys"

