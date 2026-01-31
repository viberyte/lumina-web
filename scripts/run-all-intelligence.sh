#!/bin/bash

echo "🚀 Starting full venue intelligence extraction"
echo "Estimated: 2,000 venues × $0.03 = ~$60"
echo ""

cd /opt/viberyte/lumina-web

# Run in background with nohup
nohup node scripts/age-focused-intelligence.js 2000 > /tmp/intelligence-extraction.log 2>&1 &

PID=$!

echo "✅ Started! PID: $PID"
echo ""
echo "Monitor progress:"
echo "  tail -f /tmp/intelligence-extraction.log"
echo ""
echo "Check if running:"
echo "  ps aux | grep age-focused"
