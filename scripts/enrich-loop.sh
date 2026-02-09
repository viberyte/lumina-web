#!/bin/bash
export APIFY_TOKEN="apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel"
export OPENAI_API_KEY="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"

cd /opt/viberyte/lumina-web

while true; do
  echo "=== Starting batch at $(date) ===" >> enrich.log
  node scripts/google-enrich-venues.cjs >> enrich.log 2>&1
  
  REMAINING=$(sqlite3 data/lumina.db "SELECT COUNT(*) FROM venues WHERE should_exclude=0 AND (google_verified IS NULL OR google_verified=0)")
  
  if [ "$REMAINING" -eq 0 ]; then
    echo "=== ALL DONE! ===" >> enrich.log
    break
  fi
  
  echo "=== Batch done. $REMAINING left. Continuing... ===" >> enrich.log
  sleep 5
done
