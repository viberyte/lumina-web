#!/bin/bash
# API Health Check - Run periodically to catch broken endpoints

echo "🔍 Lumina API Health Check"
echo "=========================="

# Test venue endpoint
VENUE_TEST=$(curl -s "https://lumina.viberyte.com/api/venues/618")
if [[ "$VENUE_TEST" == *"\"name\":"* ]]; then
  echo "✅ /api/venues/[id] - OK"
else
  echo "❌ /api/venues/[id] - BROKEN: $VENUE_TEST"
fi

# Test explore endpoint (with correct params)
EXPLORE_TEST=$(curl -s "https://lumina.viberyte.com/api/explore/see-all?city=Brooklyn&category=lounges")
if [[ "$EXPLORE_TEST" == *"venues"* ]] || [[ "$EXPLORE_TEST" == *"\"id\":"* ]]; then
  echo "✅ /api/explore/see-all - OK"
else
  echo "❌ /api/explore/see-all - BROKEN: $(echo $EXPLORE_TEST | head -c 100)"
fi

# Test events endpoint  
EVENTS_TEST=$(curl -s "https://lumina.viberyte.com/api/events")
if [[ "$EVENTS_TEST" == *"\"id\":"* ]] || [[ "$EVENTS_TEST" == *"events"* ]] || [[ "$EVENTS_TEST" == "[]" ]]; then
  echo "✅ /api/events - OK"
else
  echo "❌ /api/events - BROKEN: $(echo $EVENTS_TEST | head -c 100)"
fi

echo ""
echo "Done!"
