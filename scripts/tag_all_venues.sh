#!/bin/bash

echo "🏷️ Tagging ALL remaining venues with AI"

REMAINING=$(sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT COUNT(*) FROM venues WHERE primary_vibes IS NULL;" 2>/dev/null)

echo "📊 Remaining: $REMAINING venues"
echo ""

BATCH=1
while [ "$REMAINING" -gt 0 ]; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 BATCH $BATCH - Tagging next 100 venues..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd /opt/viberyte/lumina-web
    node scripts/ai_vibe_tagger.cjs
    
    REMAINING=$(sqlite3 /opt/viberyte/lumina-web/data/lumina.db "SELECT COUNT(*) FROM venues WHERE primary_vibes IS NULL;" 2>/dev/null)
    
    echo ""
    echo "📌 Remaining: $REMAINING venues"
    echo ""
    
    if [ "$REMAINING" -eq 0 ]; then
        echo "✅ ALL VENUES TAGGED!"
        break
    fi
    
    BATCH=$((BATCH + 1))
    sleep 3
done

echo ""
echo "🎉 COMPLETE!"
