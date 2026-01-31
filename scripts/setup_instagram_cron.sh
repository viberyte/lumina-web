#!/bin/bash

# Add cron job for Instagram sync (runs every 6 hours)
(crontab -l 2>/dev/null; echo "0 */6 * * * cd /opt/viberyte/lumina-web && node scripts/instagram_auto_sync.cjs >> logs/instagram_sync.log 2>&1") | crontab -

echo "✅ Cron job installed: Instagram sync runs every 6 hours"
echo "📋 View with: crontab -l"
