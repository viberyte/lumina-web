#!/bin/bash
cd /opt/viberyte/lumina-web
node scripts/scrapers/pipeline.js >> /opt/viberyte/logs/scraper-pipeline.log 2>&1
