#!/bin/bash
echo "=== COMPLETION CHECK ==="
echo "Time: $(date)"
echo ""

PHILLY=$(cat philly/super_enriched_philly.json | grep -c '"venueName":')
BALTIMORE=$(cat baltimore/super_enriched_baltimore.json | grep -c '"venueName":')
RICHMOND=$(cat richmond/super_enriched_richmond.json | grep -c '"venueName":')
NORFOLK=$(cat norfolk/super_enriched_norfolk.json | grep -c '"venueName":')

echo "Philly:    $PHILLY / 404 $([ $PHILLY -eq 404 ] && echo '✅ COMPLETE' || echo '⏳ Running')"
echo "Baltimore: $BALTIMORE / 497 $([ $BALTIMORE -eq 497 ] && echo '✅ COMPLETE' || echo '⏳ Running')"
echo "Richmond:  $RICHMOND / 479 $([ $RICHMOND -eq 479 ] && echo '✅ COMPLETE' || echo '⏳ Running')"
echo "Norfolk:   $NORFOLK / 346 $([ $NORFOLK -eq 346 ] && echo '✅ COMPLETE' || echo '⏳ Running')"
echo ""

TOTAL=$((PHILLY + BALTIMORE + RICHMOND + NORFOLK))
echo "Total: $TOTAL / 1726"

if [ $PHILLY -eq 404 ] && [ $BALTIMORE -eq 497 ] && [ $RICHMOND -eq 479 ] && [ $NORFOLK -eq 346 ]; then
  echo ""
  echo "🎉🎉🎉 ALL CITIES COMPLETE! 🎉🎉🎉"
fi
