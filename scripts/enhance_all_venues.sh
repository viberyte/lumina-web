#!/bin/bash

echo "🌍 Processing ALL remaining venues with Google Places"

REMAINING=$(sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT COUNT(*) FROM venues WHERE google_place_id IS NULL;" 2>/dev/null)

echo "📊 Total remaining: $REMAINING venues"
echo ""

BATCH=1
while [ "$REMAINING" -gt 0 ]; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 BATCH $BATCH - Processing next 100 venues..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd /opt/viberyte/lumina-web
    node scripts/enhance_with_google_final.cjs
    
    # Check remaining
    REMAINING=$(sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT COUNT(*) FROM venues WHERE google_place_id IS NULL;" 2>/dev/null)
    
    echo ""
    echo "📌 Remaining after batch $BATCH: $REMAINING venues"
    echo ""
    
    if [ "$REMAINING" -eq 0 ]; then
        echo "✅ ALL VENUES COMPLETE!"
        break
    fi
    
    BATCH=$((BATCH + 1))
    
    # Small delay between batches
    echo "⏸️  Waiting 5 seconds before next batch..."
    sleep 5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 COMPLETE! All venues enhanced with Google data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Show final stats
sqlite3 /opt/viberyte/lumina-web/data/lumina.db << SQL
SELECT 
    'Total Venues: ' || COUNT(*) FROM venues;
SELECT 
    'With Google Data: ' || COUNT(*) FROM venues WHERE google_place_id IS NOT NULL;
SELECT 
    'Late Night Spots: ' || COUNT(*) FROM venues WHERE late_night_spot = 1;
SQL

