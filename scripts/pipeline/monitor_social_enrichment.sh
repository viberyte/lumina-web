#!/bin/bash
echo "=========================================="
echo "   LUMINA SOCIAL MEDIA ENRICHMENT STATUS"
echo "   $(date)"
echo "=========================================="
echo ""

echo "🎥 TIKTOK ENRICHMENT:"
echo "  Philly:    $(cat philly/tiktok_enriched_philly.json 2>/dev/null | jq 'length' 2>/dev/null || echo '0') / 404"
echo "  Baltimore: $(cat baltimore/tiktok_enriched_baltimore.json 2>/dev/null | jq 'length' 2>/dev/null || echo '0') / 497"
echo "  Richmond:  $(cat richmond/tiktok_enriched_richmond.json 2>/dev/null | jq 'length' 2>/dev/null || echo '0') / 479"
echo "  Norfolk:   $(cat norfolk/tiktok_enriched_norfolk.json 2>/dev/null | jq 'length' 2>/dev/null || echo '0') / 346"

TOTAL_TIKTOK=$(($(cat philly/tiktok_enriched_philly.json 2>/dev/null | jq 'length' 2>/dev/null || echo '0') + $(cat baltimore/tiktok_enriched_baltimore.json 2>/dev/null | jq 'length' 2>/dev/null || echo '0') + $(cat richmond/tiktok_enriched_richmond.json 2>/dev/null | jq 'length' 2>/dev/null || echo '0') + $(cat norfolk/tiktok_enriched_norfolk.json 2>/dev/null | jq 'length' 2>/dev/null || echo '0')))

echo "  TOTAL: $TOTAL_TIKTOK / 1726"
echo ""

echo "📸 INSTAGRAM ENRICHMENT:"
echo "  (Skipped - API format issues)"
echo ""

echo "=========================================="
